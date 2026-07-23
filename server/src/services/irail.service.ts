import type {
  IRailDeparture,
  IRailLiveboardResponse,
  IRailLiveboardResult,
  IRailStation,
  IRailStationsResponse,
} from "../types/irail.types.js";

const STATIONS_URL =
  "https://api.irail.be/stations/?format=json&lang=en";

const LIVEBOARD_URL = "https://api.irail.be/liveboard/";

let cachedStations: IRailStation[] | null = null;

export async function getStations(): Promise<IRailStation[]> {
  if (cachedStations !== null) {
    return cachedStations;
  }

  const response = await fetch(STATIONS_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "LagoviaTrainTracker/0.1 (DPS technical challenge)",
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(
      `iRail stations request failed with status ${response.status}`,
    );
  }

  const data =
    (await response.json()) as Partial<IRailStationsResponse>;

  if (!Array.isArray(data.station)) {
    throw new Error("iRail returned an invalid stations response.");
  }

  cachedStations = data.station;

  return cachedStations;
}

export async function getLiveboardForStation(
  stationId: string,
): Promise<IRailLiveboardResult> {
  const url = new URL(LIVEBOARD_URL);

  url.search = new URLSearchParams({
    id: stationId,
    arrdep: "departure",
    format: "json",
    lang: "en",
    alerts: "false",
  }).toString();

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "LagoviaTrainTracker/0.1 (DPS technical challenge)",
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(
      `iRail liveboard request failed with status ${response.status}`,
    );
  }

  const data =
    (await response.json()) as Partial<IRailLiveboardResponse>;

  if (
    typeof data.station !== "string" ||
    typeof data.departures !== "object" ||
    data.departures === null
  ) {
    throw new Error("iRail returned an invalid liveboard response.");
  }

  const rawDepartures = data.departures.departure;

  if (rawDepartures === undefined) {
    if (Number(data.departures.number) === 0) {
      return {
        stationName: data.station,
        departures: [],
      };
    }

    throw new Error(
      "iRail liveboard response is missing its departure list.",
    );
  }

  if (!Array.isArray(rawDepartures)) {
    throw new Error(
      "iRail liveboard departure list is invalid.",
    );
  }

  return {
    stationName: data.station,
    departures: rawDepartures as IRailDeparture[],
  };
}
