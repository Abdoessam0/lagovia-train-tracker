import {
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import "./App.css";
import { EmptyResults } from "./components/EmptyResults";
import { StationDeparturesSection } from "./components/StationDeparturesSection";
import {
  searchSelectedStation,
  searchTypedStationQuery,
} from "./services/departureSearchActions";
import { searchLocalStations } from "./services/stationAutocomplete";
import type { DeparturesSearchResult } from "./types/departure";
import type { StationOption } from "./types/station";

const AUTOCOMPLETE_DELAY_MS = 200;

function normalizeQuery(query: string): string {
  return query.trim();
}

function getQueryKey(query: string): string {
  return normalizeQuery(query).toLocaleLowerCase();
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "AbortError"
  );
}

const updateTimeFormatter = new Intl.DateTimeFormat(
  undefined,
  {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  },
);

function formatUpdateTime(timestamp: string): string {
  const date = new Date(timestamp);

  return Number.isNaN(date.getTime())
    ? timestamp
    : updateTimeFormatter.format(date);
}

interface AutocompleteMetadata {
  queryKey: string;
  totalMatchedStations: number;
}

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] =
    useState<DeparturesSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastSuccessfulQuery, setLastSuccessfulQuery] =
    useState("");
  const [suggestions, setSuggestions] = useState<
    StationOption[]
  >([]);
  const [autocompleteOpen, setAutocompleteOpen] =
    useState(false);
  const [autocompleteLoading, setAutocompleteLoading] =
    useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] =
    useState(-1);
  const [
    departureSearchStationCount,
    setDepartureSearchStationCount,
  ] = useState<number | null>(null);

  const autocompleteTimerRef = useRef<number | null>(null);
  const autocompleteRequestRef =
    useRef<AbortController | null>(null);
  const autocompleteSequenceRef = useRef(0);
  const departureRequestRef =
    useRef<AbortController | null>(null);
  const departureSequenceRef = useRef(0);
  const activeDepartureQueryKeyRef = useRef<
    string | null
  >(null);
  const latestAutocompleteRef =
    useRef<AutocompleteMetadata | null>(null);
  const selectedStationQueryKeyRef = useRef<
    string | null
  >(null);

  const clearPendingAutocomplete = useCallback(() => {
    if (autocompleteTimerRef.current !== null) {
      window.clearTimeout(autocompleteTimerRef.current);
      autocompleteTimerRef.current = null;
    }
  }, []);

  const cancelAutocompleteRequest = useCallback(() => {
    if (autocompleteRequestRef.current !== null) {
      autocompleteRequestRef.current.abort();
      autocompleteRequestRef.current = null;
      autocompleteSequenceRef.current += 1;
    }

    setAutocompleteLoading(false);
  }, []);

  const closeAutocomplete = useCallback(() => {
    setAutocompleteOpen(false);
    setActiveSuggestionIndex(-1);
  }, []);

  const cancelDepartureRequest = useCallback(() => {
    if (departureRequestRef.current !== null) {
      departureRequestRef.current.abort();
      departureRequestRef.current = null;
      activeDepartureQueryKeyRef.current = null;
      departureSequenceRef.current += 1;
    }

    setLoading(false);
    setDepartureSearchStationCount(null);
  }, []);

  const loadAutocomplete = useCallback(
    async (normalizedQuery: string) => {
      cancelAutocompleteRequest();

      const controller = new AbortController();
      const requestId =
        autocompleteSequenceRef.current + 1;
      const queryKey = getQueryKey(normalizedQuery);

      autocompleteSequenceRef.current = requestId;
      autocompleteRequestRef.current = controller;
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
      setAutocompleteLoading(true);
      setAutocompleteOpen(true);

      try {
        const response =
          searchLocalStations(normalizedQuery);

        if (
          controller.signal.aborted ||
          requestId !== autocompleteSequenceRef.current
        ) {
          return;
        }

        latestAutocompleteRef.current = {
          queryKey,
          totalMatchedStations:
            response.totalMatchedStations,
        };
        setSuggestions(response.stations);
        setAutocompleteOpen(true);
      } catch (caughtError) {
        if (
          controller.signal.aborted ||
          isAbortError(caughtError) ||
          requestId !== autocompleteSequenceRef.current
        ) {
          return;
        }

        latestAutocompleteRef.current = null;
        setSuggestions([]);
        setAutocompleteOpen(false);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Station information is temporarily unavailable.",
        );
      } finally {
        if (requestId === autocompleteSequenceRef.current) {
          autocompleteRequestRef.current = null;
          setAutocompleteLoading(false);
        }
      }
    },
    [cancelAutocompleteRequest],
  );

  const performDepartureSearch = useCallback(
    async (
      normalizedQuery: string,
      knownStationCount?: number,
      selectedStation?: StationOption,
    ) => {
      clearPendingAutocomplete();
      cancelAutocompleteRequest();
      closeAutocomplete();
      cancelDepartureRequest();

      const controller = new AbortController();
      const requestId = departureSequenceRef.current + 1;
      const queryKey = getQueryKey(normalizedQuery);

      departureSequenceRef.current = requestId;
      departureRequestRef.current = controller;
      activeDepartureQueryKeyRef.current = queryKey;

      setError("");
      setLoading(true);
      setDepartureSearchStationCount(
        knownStationCount ?? null,
      );

      try {
        if (knownStationCount === undefined) {
          try {
            const stationResult =
              searchLocalStations(normalizedQuery);

            if (
              controller.signal.aborted ||
              requestId !== departureSequenceRef.current
            ) {
              return;
            }

            setDepartureSearchStationCount(
              stationResult.totalMatchedStations,
            );
          } catch (caughtError) {
            if (
              controller.signal.aborted ||
              isAbortError(caughtError) ||
              requestId !== departureSequenceRef.current
            ) {
              return;
            }

            // The departure search can still succeed if only the
            // lightweight station-count request failed.
          }
        }

        const response =
          selectedStation === undefined
            ? await searchTypedStationQuery(
                normalizedQuery,
                controller.signal,
              )
            : await searchSelectedStation(
                selectedStation,
                controller.signal,
              );

        if (
          controller.signal.aborted ||
          requestId !== departureSequenceRef.current
        ) {
          return;
        }

        setResults(response);
        setLastSuccessfulQuery(normalizedQuery);
      } catch (caughtError) {
        if (
          controller.signal.aborted ||
          isAbortError(caughtError) ||
          requestId !== departureSequenceRef.current
        ) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Train information is temporarily unavailable.",
        );
      } finally {
        if (requestId === departureSequenceRef.current) {
          departureRequestRef.current = null;
          activeDepartureQueryKeyRef.current = null;
          setLoading(false);
          setDepartureSearchStationCount(null);
        }
      }
    },
    [
      cancelAutocompleteRequest,
      cancelDepartureRequest,
      clearPendingAutocomplete,
      closeAutocomplete,
    ],
  );

  useEffect(() => {
    const normalizedQuery = normalizeQuery(query);

    if (
      normalizedQuery.length < 3 ||
      selectedStationQueryKeyRef.current ===
        getQueryKey(normalizedQuery)
    ) {
      return;
    }

    const timerId = window.setTimeout(() => {
      if (autocompleteTimerRef.current === timerId) {
        autocompleteTimerRef.current = null;
      }

      void loadAutocomplete(normalizedQuery);
    }, AUTOCOMPLETE_DELAY_MS);

    autocompleteTimerRef.current = timerId;

    return () => {
      window.clearTimeout(timerId);

      if (autocompleteTimerRef.current === timerId) {
        autocompleteTimerRef.current = null;
      }
    };
  }, [loadAutocomplete, query]);

  useEffect(
    () => () => {
      clearPendingAutocomplete();
      cancelAutocompleteRequest();
      cancelDepartureRequest();
    },
    [
      cancelAutocompleteRequest,
      cancelDepartureRequest,
      clearPendingAutocomplete,
    ],
  );

  function handleQueryChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextQuery = event.target.value;
    const normalizedQuery = normalizeQuery(nextQuery);
    const nextQueryKey = getQueryKey(normalizedQuery);

    selectedStationQueryKeyRef.current = null;
    latestAutocompleteRef.current = null;
    clearPendingAutocomplete();
    cancelAutocompleteRequest();
    closeAutocomplete();
    setSuggestions([]);
    setQuery(nextQuery);
    setError("");

    if (normalizedQuery.length < 3) {
      cancelDepartureRequest();
      setResults(null);
      setLastSuccessfulQuery("");
      return;
    }

    if (
      activeDepartureQueryKeyRef.current !== null &&
      activeDepartureQueryKeyRef.current !== nextQueryKey
    ) {
      cancelDepartureRequest();
    }
  }

  function selectStation(option: StationOption) {
    const stationName = option.name;

    selectedStationQueryKeyRef.current =
      getQueryKey(stationName);
    latestAutocompleteRef.current = {
      queryKey: getQueryKey(stationName),
      totalMatchedStations: 1,
    };
    clearPendingAutocomplete();
    cancelAutocompleteRequest();
    closeAutocomplete();
    setSuggestions([]);
    setQuery(stationName);
    setError("");

    void performDepartureSearch(stationName, 1, option);
  }

  function handleInputKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Escape") {
      if (autocompleteOpen) {
        event.preventDefault();
        closeAutocomplete();
      }

      return;
    }

    if (
      (event.key === "ArrowDown" ||
        event.key === "ArrowUp") &&
      suggestions.length > 0
    ) {
      event.preventDefault();
      setAutocompleteOpen(true);
      setActiveSuggestionIndex((currentIndex) => {
        if (event.key === "ArrowDown") {
          return currentIndex >= suggestions.length - 1
            ? 0
            : currentIndex + 1;
        }

        return currentIndex <= 0
          ? suggestions.length - 1
          : currentIndex - 1;
      });

      return;
    }

    if (
      event.key === "Enter" &&
      autocompleteOpen &&
      activeSuggestionIndex >= 0
    ) {
      const activeSuggestion =
        suggestions[activeSuggestionIndex];

      if (activeSuggestion !== undefined) {
        event.preventDefault();
        selectStation(activeSuggestion);
      }
    }
  }

  function handleAutocompleteBlur(
    event: FocusEvent<HTMLDivElement>,
  ) {
    const nextFocusedElement = event.relatedTarget;

    if (
      nextFocusedElement === null ||
      !event.currentTarget.contains(nextFocusedElement)
    ) {
      closeAutocomplete();
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    clearPendingAutocomplete();
    cancelAutocompleteRequest();
    closeAutocomplete();

    const normalizedQuery = normalizeQuery(query);
    setError("");

    if (normalizedQuery.length < 3) {
      cancelDepartureRequest();
      setResults(null);
      setLastSuccessfulQuery("");
      setError("Please enter at least 3 characters.");
      return;
    }

    const queryKey = getQueryKey(normalizedQuery);
    const autocompleteMetadata =
      latestAutocompleteRef.current;
    const knownStationCount =
      autocompleteMetadata?.queryKey === queryKey
        ? autocompleteMetadata.totalMatchedStations
        : undefined;

    await performDepartureSearch(
      normalizedQuery,
      knownStationCount,
    );
  }

  const stationsWithDepartures =
    results?.stations.filter(
      (station) => station.departures.length > 0,
    ) ?? [];
  const stationsWithoutDepartures = results
    ? results.stations.length - stationsWithDepartures.length
    : 0;
  const activeOptionId =
    autocompleteOpen && activeSuggestionIndex >= 0
      ? `station-suggestion-${activeSuggestionIndex}`
      : undefined;

  return (
    <div className="rail-app">
      <header className="lagovia-header">
        <div className="content-width header-content">
          <a
            className="lagovia-identity"
            href="/"
            aria-label="Lagovia home"
          >
            <span className="lagovia-mark" aria-hidden="true">
              <svg viewBox="0 0 36 32">
                <rect x="2" y="2" width="32" height="28" rx="2" />
                <path d="M12 7v18M24 7v18M8 11h20M8 16h20M8 21h20" />
              </svg>
            </span>
            <span className="identity-copy">
              <strong>Lagovia</strong>
            </span>
          </a>
          <p className="network-description">
            Belgian railway information
          </p>
        </div>
      </header>

      <main className="content-width railway-main">
        <section className="page-introduction">
          <h1 id="page-title">Live departures</h1>
          <p>
            Departures scheduled in the next 15 minutes
          </p>
        </section>

        <section
          className="station-search"
          aria-labelledby="search-heading"
        >
          <h2 id="search-heading" className="visually-hidden">
            Search for a station
          </h2>

          <form
            className="station-search-form"
            onSubmit={handleSubmit}
            aria-busy={loading}
          >
            <div className="station-search-toolbar">
              <span className="station-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M4 20h16M6 20V9l6-5 6 5v11M9 12h6M9 16h6" />
                </svg>
              </span>
              <div className="station-search-field">
                <label htmlFor="station-query">Station</label>
              <div
                className="autocomplete-control"
                onBlur={handleAutocompleteBlur}
              >
                <input
                  id="station-query"
                  name="station"
                  type="search"
                  role="combobox"
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => {
                    const metadata =
                      latestAutocompleteRef.current;

                    if (
                      metadata?.queryKey ===
                        getQueryKey(query) &&
                      suggestions.length > 0
                    ) {
                      setAutocompleteOpen(true);
                    }
                  }}
                  placeholder="e.g. Brussels"
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={autocompleteOpen}
                  aria-controls={
                    suggestions.length > 0
                      ? "station-suggestions"
                      : undefined
                  }
                  aria-activedescendant={activeOptionId}
                  aria-describedby={
                    error
                      ? "station-search-hint search-error"
                      : "station-search-hint"
                  }
                  aria-invalid={error ? "true" : undefined}
                />

                {autocompleteOpen && (
                  <div
                    className="autocomplete-menu"
                  >
                    {autocompleteLoading ? (
                      <p
                        className="autocomplete-message"
                        role="status"
                      >
                        Finding stations…
                      </p>
                    ) : suggestions.length > 0 ? (
                      <ul
                        id="station-suggestions"
                        className="autocomplete-list"
                        role="listbox"
                        aria-label="Station suggestions"
                      >
                        {suggestions.map(
                          (option, optionIndex) => (
                            <li
                              key={option.id}
                              role="presentation"
                            >
                              <button
                                id={`station-suggestion-${optionIndex}`}
                                type="button"
                                role="option"
                                aria-selected={
                                  optionIndex ===
                                  activeSuggestionIndex
                                }
                                className={
                                  optionIndex ===
                                  activeSuggestionIndex
                                    ? "is-active"
                                    : undefined
                                }
                                onMouseDown={(mouseEvent) => {
                                  mouseEvent.preventDefault();
                                }}
                                onClick={() => {
                                  selectStation(option);
                                }}
                              >
                                <span className="suggestion-copy">
                                  <span>{option.name}</span>
                                  <small>
                                    {option.standardName}
                                  </small>
                                </span>
                                <span
                                  className="suggestion-arrow"
                                  aria-hidden="true"
                                >
                                  ›
                                </span>
                              </button>
                            </li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <p
                        className="autocomplete-message"
                        role="status"
                      >
                        No matching stations.
                      </p>
                    )}
                  </div>
                )}
              </div>

                <p
                  id="station-search-hint"
                  className="input-hint"
                >
                  Enter at least 3 characters.
                </p>
              </div>

              <button
                className="search-submit"
                type="submit"
                disabled={loading}
              >
                Search
              </button>
            </div>

            <div className="search-feedback">
              <div
                className="search-status"
                aria-live="polite"
                aria-atomic="true"
              >
                {loading && (
                  <p className="loading-message">
                    {departureSearchStationCount === null
                      ? "Searching departures across matching stations…"
                      : `Searching departures across ${departureSearchStationCount} matching stations…`}
                    {results && lastSuccessfulQuery
                      ? ` Showing results for ${lastSuccessfulQuery} while refreshing.`
                      : ""}
                  </p>
                )}
              </div>

              {error && (
                <p
                  id="search-error"
                  className="error-message"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </p>
              )}
            </div>
          </form>
        </section>

        {results && (
          <>
            <section
              className="result-context"
              aria-labelledby="results-heading"
              aria-busy={loading}
            >
              <h2 id="results-heading" className="visually-hidden">
                Search results
              </h2>

              <div className="result-metadata">
                <div className="result-statistics">
                  <span>
                    <strong>{results.totalMatchedStations}</strong>{" "}
                    matched stations
                  </span>
                  <span
                    className="metadata-separator"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                  <span>
                    <strong>{results.totalReturnedStations}</strong>{" "}
                    returned stations
                  </span>
                  <span
                    className="metadata-separator"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                  <span>
                    <strong>{results.totalDepartures}</strong>{" "}
                    upcoming departures
                  </span>
                </div>
                <time dateTime={results.generatedAt}>
                  Updated {formatUpdateTime(results.generatedAt)}
                </time>
              </div>

              {results.partial &&
                results.warnings.length > 0 && (
                  <aside
                    className="service-warning"
                    aria-labelledby="warning-title"
                  >
                    <h3 id="warning-title">
                      Some results are unavailable
                    </h3>
                    <ul>
                      {results.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </aside>
                )}
            </section>

            {results.totalDepartures === 0 ? (
              <EmptyResults
                stationCount={stationsWithoutDepartures}
              />
            ) : (
              <section
                className="departure-results"
                aria-labelledby="station-results-heading"
                aria-busy={loading}
              >
                <header className="departure-results-heading">
                  <h2 id="station-results-heading">
                    Departures by station
                  </h2>
                  {stationsWithoutDepartures > 0 && (
                    <p className="no-service-note" role="status">
                      {stationsWithoutDepartures} matched{" "}
                      {stationsWithoutDepartures === 1
                        ? "station has"
                        : "stations have"}{" "}
                      no departures in the next 15 minutes.
                    </p>
                  )}
                </header>

                <div className="station-groups">
                  {stationsWithDepartures.map((station) => (
                    <StationDeparturesSection
                      key={station.stationId}
                      station={station}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="lagovia-footer">
        <div className="content-width">
          Live timetable information provided by iRail.
        </div>
      </footer>
    </div>
  );
}

export default App;
