import { describe, expect, it, vi } from "vitest";

import {
  searchSelectedStation,
  searchTypedStationQuery,
} from "../../client/src/services/departureSearchActions";
import { searchLocalStations } from "../../client/src/services/stationAutocomplete";
import type { DeparturesSearchResult } from "../../client/src/types/departure";

const EMPTY_RESULT: DeparturesSearchResult = {
  query: "",
  generatedAt: "2026-07-24T12:00:00.000Z",
  windowMinutes: 15,
  totalMatchedStations: 0,
  totalReturnedStations: 0,
  totalDepartures: 0,
  partial: false,
  warnings: [],
  stations: [],
};

describe("client station search flows", () => {
  it("uses bundled local data and returns no suggestions below three characters", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(searchLocalStations("B").stations).toEqual([]);
    expect(searchLocalStations(" Br ").stations).toEqual([]);

    const result = searchLocalStations("Bru");

    expect(result.totalMatchedStations).toBeGreaterThan(1);
    expect(result.stations.length).toBeLessThanOrEqual(8);
    expect(
      result.stations.some(
        (station) => station.name === "Brussels-Central",
      ),
    ).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("matches standard names case-insensitively", () => {
    const result = searchLocalStations("BRUXELLES-CENTRAL");

    expect(
      result.stations.some(
        (station) => station.name === "Brussels-Central",
      ),
    ).toBe(true);
  });

  it("selecting a suggestion requests departures using its station name", async () => {
    const request = vi.fn().mockResolvedValue(EMPTY_RESULT);
    const station = {
      id: "BE.NMBS.008813003",
      name: "Brussels-Central",
      standardName: "Brussel-Centraal/Bruxelles-Central",
    };

    await searchSelectedStation(station, undefined, request);

    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(
      "Brussels-Central",
      undefined,
    );
  });

  it("submitting Bru sends the full typed substring", async () => {
    const request = vi.fn().mockResolvedValue(EMPTY_RESULT);

    await searchTypedStationQuery(
      " Bru ",
      undefined,
      request,
    );

    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith("Bru", undefined);
  });
});
