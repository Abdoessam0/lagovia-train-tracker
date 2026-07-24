import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { IRailDeparture } from "../src/types/irail.types.js";

vi.mock("../src/services/irail.service.js", () => ({
  getStations: vi.fn(),
  getLiveboardForStation: vi.fn(),
}));

import { getDeparturesForQuery } from "../src/services/departures.service.js";
import {
  getLiveboardForStation,
  getStations,
} from "../src/services/irail.service.js";

const mockedGetStations = vi.mocked(getStations);
const mockedGetLiveboardForStation = vi.mocked(
  getLiveboardForStation,
);
const NOW_MS = Date.UTC(2026, 6, 24, 12, 0, 0);

function createRawDeparture(
  overrides: Partial<IRailDeparture> = {},
): IRailDeparture {
  return {
    id: "departure-id",
    station: "Destination",
    time: (NOW_MS + 5 * 60 * 1000) / 1000,
    delay: "0",
    canceled: "0",
    vehicle: "BE.NMBS.IC1234",
    ...overrides,
  };
}

describe("departure search service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);
    mockedGetStations.mockReset();
    mockedGetLiveboardForStation.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("keeps substring search across every matching station", async () => {
    mockedGetStations.mockResolvedValue([
      {
        id: "bruges",
        name: "Bruges",
        standardname: "Brugge",
      },
      {
        id: "brussels-central",
        name: "Brussels-Central",
        standardname: "Brussel-Centraal/Bruxelles-Central",
      },
      {
        id: "antwerp",
        name: "Antwerp-Central",
        standardname: "Antwerpen-Centraal",
      },
    ]);
    mockedGetLiveboardForStation.mockImplementation(
      async (stationId) => ({
        stationName:
          stationId === "bruges"
            ? "Bruges"
            : "Brussels-Central",
        departures: [
          createRawDeparture({
            id: `${stationId}-departure`,
            station: `${stationId} destination`,
            vehicle: `BE.NMBS.${stationId}`,
          }),
        ],
      }),
    );

    const result = await getDeparturesForQuery("Bru");

    expect(result.totalMatchedStations).toBe(2);
    expect(result.totalReturnedStations).toBe(2);
    expect(result.totalDepartures).toBe(2);
    expect(
      result.stations.map((station) => station.stationName),
    ).toEqual(["Bruges", "Brussels-Central"]);
    expect(mockedGetLiveboardForStation).toHaveBeenCalledTimes(
      2,
    );
    expect(result.stations[0]?.departures[0]).toEqual({
      trainNumber: "bruges",
      destination: "bruges destination",
      scheduledDepartureTime:
        "2026-07-24T12:05:00.000Z",
      delayMinutes: 0,
      cancelled: false,
    });
  });

  it("does not cache final results and filters again with a fresh request time", async () => {
    mockedGetStations.mockResolvedValue([
      {
        id: "fresh-clock",
        name: "Fresh Clock",
        standardname: "Fresh Clock",
      },
    ]);
    mockedGetLiveboardForStation.mockResolvedValue({
      stationName: "Fresh Clock",
      departures: [createRawDeparture()],
    });

    const first = await getDeparturesForQuery("Fresh Clock");

    vi.setSystemTime(NOW_MS + 6 * 60 * 1000);

    const second = await getDeparturesForQuery("Fresh Clock");

    expect(first.generatedAt).toBe(
      "2026-07-24T12:00:00.000Z",
    );
    expect(first.totalDepartures).toBe(1);
    expect(second.generatedAt).toBe(
      "2026-07-24T12:06:00.000Z",
    );
    expect(second.totalDepartures).toBe(0);
    expect(mockedGetStations).toHaveBeenCalledTimes(2);
    expect(mockedGetLiveboardForStation).toHaveBeenCalledTimes(
      2,
    );
  });

  it("returns successful station results with warnings after a partial failure", async () => {
    mockedGetStations.mockResolvedValue([
      {
        id: "available",
        name: "Available Station",
        standardname: "Available Station",
      },
      {
        id: "unavailable",
        name: "Unavailable Station",
        standardname: "Unavailable Station",
      },
    ]);
    mockedGetLiveboardForStation.mockImplementation(
      async (stationId) => {
        if (stationId === "unavailable") {
          throw new Error("Liveboard unavailable");
        }

        return {
          stationName: "Available Station",
          departures: [createRawDeparture()],
        };
      },
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getDeparturesForQuery("Station");

    expect(result.totalMatchedStations).toBe(2);
    expect(result.totalReturnedStations).toBe(1);
    expect(result.totalDepartures).toBe(1);
    expect(result.partial).toBe(true);
    expect(result.warnings).toEqual([
      "Departures could not be loaded for Unavailable Station.",
    ]);
    expect(result.stations).toHaveLength(1);
    expect(result.stations[0]?.stationName).toBe(
      "Available Station",
    );
  });

  it("limits concurrent Liveboard work to batches of three", async () => {
    mockedGetStations.mockResolvedValue(
      Array.from({ length: 4 }, (_, index) => ({
        id: `batch-${index + 1}`,
        name: `Batch Station ${index + 1}`,
        standardname: `Batch Station ${index + 1}`,
      })),
    );
    mockedGetLiveboardForStation.mockImplementation(
      async (stationId) => ({
        stationName: stationId,
        departures: [],
      }),
    );

    const resultPromise = getDeparturesForQuery("Batch");

    await vi.advanceTimersByTimeAsync(0);

    expect(mockedGetLiveboardForStation).toHaveBeenCalledTimes(
      3,
    );

    await vi.advanceTimersByTimeAsync(1100);

    const result = await resultPromise;

    expect(mockedGetLiveboardForStation).toHaveBeenCalledTimes(
      4,
    );
    expect(result.totalReturnedStations).toBe(4);
  });

  it("fails when every matching Liveboard request fails", async () => {
    mockedGetStations.mockResolvedValue([
      {
        id: "failed-station",
        name: "Failed Station",
        standardname: "Failed Station",
      },
    ]);
    mockedGetLiveboardForStation.mockRejectedValue(
      new Error("iRail unavailable"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      getDeparturesForQuery("Failed"),
    ).rejects.toThrow("All iRail Liveboard requests failed.");
  });
});
