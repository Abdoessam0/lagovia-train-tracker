import type {
  DeparturesSearchResult,
  StationDepartures,
} from "../types/departure.types.js";
import { getUpcomingDepartures } from "../utils/departure.utils.js";
import {
  getLiveboardForStation,
  getStations,
} from "./irail.service.js";

const DEPARTURE_WINDOW_MINUTES = 15;
const LIVEBOARD_BATCH_SIZE = 3;
const BATCH_DELAY_MS = 1100;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function getDeparturesForQuery(
  query: string,
): Promise<DeparturesSearchResult> {
  const nowMs = Date.now();
  const stations = await getStations();
  const normalizedQuery = query.toLowerCase();

  const matchedStations = stations
    .filter((station) => {
      const englishName = station.name.toLowerCase();
      const standardName =
        station.standardname.toLowerCase();

      return (
        englishName.includes(normalizedQuery) ||
        standardName.includes(normalizedQuery)
      );
    })
    .sort((firstStation, secondStation) =>
      firstStation.name.localeCompare(
        secondStation.name,
      ),
    );

  const stationResults: StationDepartures[] = [];
  const warnings: string[] = [];

  for (
    let index = 0;
    index < matchedStations.length;
    index += LIVEBOARD_BATCH_SIZE
  ) {
    const batch = matchedStations.slice(
      index,
      index + LIVEBOARD_BATCH_SIZE,
    );

    const batchResults = await Promise.allSettled(
      batch.map(async (station) => {
        const liveboard =
          await getLiveboardForStation(station.id);

        return {
          stationId: station.id,
          stationName: liveboard.stationName,
          departures: getUpcomingDepartures(
            liveboard.departures,
            nowMs,
            DEPARTURE_WINDOW_MINUTES,
          ),
        };
      }),
    );

    batchResults.forEach((result, batchIndex) => {
      const station = batch[batchIndex];

      if (station === undefined) {
        return;
      }

      if (result.status === "fulfilled") {
        stationResults.push(result.value);
        return;
      }

      console.error(
        `Failed to load departures for ${station.name}:`,
        result.reason,
      );

      warnings.push(
        `Departures could not be loaded for ${station.name}.`,
      );
    });

    const hasMoreBatches =
      index + LIVEBOARD_BATCH_SIZE <
      matchedStations.length;

    if (hasMoreBatches) {
      await wait(BATCH_DELAY_MS);
    }
  }

  if (
    matchedStations.length > 0 &&
    stationResults.length === 0
  ) {
    throw new Error(
      "All iRail Liveboard requests failed.",
    );
  }

  stationResults.sort((firstStation, secondStation) =>
    firstStation.stationName.localeCompare(
      secondStation.stationName,
    ),
  );

  const totalDepartures = stationResults.reduce(
    (total, station) =>
      total + station.departures.length,
    0,
  );

  return {
    query,
    generatedAt: new Date(nowMs).toISOString(),
    windowMinutes: DEPARTURE_WINDOW_MINUTES,
    totalMatchedStations: matchedStations.length,
    totalReturnedStations: stationResults.length,
    totalDepartures,
    partial: warnings.length > 0,
    warnings,
    stations: stationResults,
  };
}
