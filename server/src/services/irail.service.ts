import type {
  IRailStation,
  IRailStationsResponse,
} from "../types/irail.types.js";

const STATIONS_URL =
  "https://api.irail.be/stations/?format=json&lang=en";

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
