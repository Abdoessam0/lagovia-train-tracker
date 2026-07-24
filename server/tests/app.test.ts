import request from "supertest";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("../src/services/departures.service.js", () => ({
  getDeparturesForQuery: vi.fn(),
}));

import app from "../src/app.js";
import { getDeparturesForQuery } from "../src/services/departures.service.js";

const mockedGetDeparturesForQuery = vi.mocked(
  getDeparturesForQuery,
);

describe("Express endpoints", () => {
  beforeEach(() => {
    mockedGetDeparturesForQuery.mockReset();
  });

  it("returns service health", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "lagovia-train-tracker-api",
    });
  });

  it("rejects a missing departure query", async () => {
    const response = await request(app).get(
      "/api/departures",
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "QUERY_REQUIRED",
        message: "Please provide a station search query.",
      },
    });
    expect(mockedGetDeparturesForQuery).not.toHaveBeenCalled();
  });

  it("rejects a departure query shorter than three characters", async () => {
    const response = await request(app)
      .get("/api/departures")
      .query({ q: " Br " });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "QUERY_TOO_SHORT",
        message: "Please enter at least 3 characters.",
      },
    });
    expect(mockedGetDeparturesForQuery).not.toHaveBeenCalled();
  });

  it("returns departures for a valid query without calling iRail", async () => {
    const serviceResult = {
      query: "Bru",
      generatedAt: "2026-07-23T18:00:00.000Z",
      windowMinutes: 15,
      totalMatchedStations: 1,
      totalReturnedStations: 1,
      totalDepartures: 1,
      partial: false,
      warnings: [],
      stations: [
        {
          stationId: "BE.NMBS.008814001",
          stationName: "Brussels-South/Brussels-Midi",
          departures: [
            {
              trainNumber: "IC 2320",
              destination: "Brussels Airport - Zaventem",
              scheduledDepartureTime:
                "2026-07-23T18:10:00.000Z",
              delayMinutes: 0,
              cancelled: false,
            },
          ],
        },
      ],
    };
    mockedGetDeparturesForQuery.mockResolvedValue(
      serviceResult,
    );

    const response = await request(app)
      .get("/api/departures")
      .query({ q: "  Bru  " });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(serviceResult);
    expect(mockedGetDeparturesForQuery).toHaveBeenCalledOnce();
    expect(mockedGetDeparturesForQuery).toHaveBeenCalledWith(
      "Bru",
    );
  });

  it("returns 502 when every matching Liveboard request fails", async () => {
    mockedGetDeparturesForQuery.mockRejectedValue(
      new Error("All iRail Liveboard requests failed."),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(app)
      .get("/api/departures")
      .query({ q: "Bru" });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: {
        code: "UPSTREAM_API_ERROR",
        message:
          "Train information is temporarily unavailable.",
      },
    });
  });

  it("does not expose a public station autocomplete endpoint", async () => {
    const response = await request(app).get("/api/stations");

    expect(response.status).toBe(404);
    expect(mockedGetDeparturesForQuery).not.toHaveBeenCalled();
  });
});
