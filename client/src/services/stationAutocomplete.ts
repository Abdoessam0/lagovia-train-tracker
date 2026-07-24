import { stations } from "../data/stations";
import type { StationsSearchResult } from "../types/station";

const MAX_SUGGESTIONS = 8;

export function searchLocalStations(
  query: string,
): StationsSearchResult {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 3) {
    return {
      query: trimmedQuery,
      totalMatchedStations: 0,
      stations: [],
    };
  }

  const normalizedQuery = trimmedQuery.toLowerCase();
  const matches = stations
    .filter(
      (station) =>
        station.name
          .toLowerCase()
          .includes(normalizedQuery) ||
        station.standardName
          .toLowerCase()
          .includes(normalizedQuery),
    )
    .sort((firstStation, secondStation) =>
      firstStation.name.localeCompare(secondStation.name),
    );

  return {
    query: trimmedQuery,
    totalMatchedStations: matches.length,
    stations: matches.slice(0, MAX_SUGGESTIONS),
  };
}
