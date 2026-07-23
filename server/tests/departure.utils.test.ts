import { describe, expect, it } from "vitest";

import type { IRailDeparture } from "../src/types/irail.types.js";
import {
  getUpcomingDepartures,
  isDepartureWithinWindow,
  normalizeDeparture,
} from "../src/utils/departure.utils.js";

const NOW_MS = Date.UTC(2026, 6, 23, 18, 0, 0);

function createRawDeparture(
  overrides: Partial<IRailDeparture> = {},
): IRailDeparture {
  return {
    id: "departure-id",
    station: "Brussels Airport - Zaventem",
    time: NOW_MS / 1000,
    delay: "0",
    canceled: "0",
    vehicle: "BE.NMBS.IC2320",
    ...overrides,
  };
}

describe("departure utilities", () => {
  describe("15-minute window", () => {
    it("includes both boundaries and excludes departures outside them", () => {
      const departures = [
        createRawDeparture({
          id: "before",
          station: "One second before",
          time: (NOW_MS - 1000) / 1000,
        }),
        createRawDeparture({
          id: "now",
          station: "Exactly now",
          time: NOW_MS / 1000,
        }),
        createRawDeparture({
          id: "ten-minutes",
          station: "Ten minutes after",
          time: (NOW_MS + 10 * 60 * 1000) / 1000,
        }),
        createRawDeparture({
          id: "fifteen-minutes",
          station: "Exactly fifteen minutes after",
          time: (NOW_MS + 15 * 60 * 1000) / 1000,
        }),
        createRawDeparture({
          id: "after",
          station: "One second after the window",
          time:
            (NOW_MS + 15 * 60 * 1000 + 1000) /
            1000,
        }),
      ];

      const result = getUpcomingDepartures(
        departures,
        NOW_MS,
        15,
      );

      expect(
        result.map((departure) => departure.destination),
      ).toEqual([
        "Exactly now",
        "Ten minutes after",
        "Exactly fifteen minutes after",
      ]);
    });

    it("rejects invalid departure timestamps", () => {
      expect(
        isDepartureWithinWindow(
          createRawDeparture({ time: "invalid" }),
          NOW_MS,
        ),
      ).toBe(false);
      expect(
        isDepartureWithinWindow(
          createRawDeparture({
            time: Number.POSITIVE_INFINITY,
          }),
          NOW_MS,
        ),
      ).toBe(false);
    });
  });

  describe("normalization", () => {
    it("normalizes destination, train number, time, delay, and cancellation", () => {
      const result = normalizeDeparture(
        createRawDeparture({
          station: " Brussels Airport - Zaventem ",
          delay: "660",
          canceled: "1",
          vehicleinfo: {
            shortname: " IC 2320 ",
          },
        }),
      );

      expect(result).toEqual({
        trainNumber: "IC 2320",
        destination: "Brussels Airport - Zaventem",
        scheduledDepartureTime:
          "2026-07-23T18:00:00.000Z",
        delayMinutes: 11,
        cancelled: true,
      });
    });

    it.each([
      ["0", 0],
      ["60", 1],
      ["89", 1],
      ["90", 2],
      ["660", 11],
    ])(
      "converts a %s-second delay to %i minute(s)",
      (delay, expectedMinutes) => {
        expect(
          normalizeDeparture(
            createRawDeparture({ delay }),
          )?.delayMinutes,
        ).toBe(expectedMinutes);
      },
    );

    it.each([
      ["1", true],
      [1, true],
      ["0", false],
      [0, false],
    ])(
      "converts cancellation value %s to %s",
      (canceled, expectedCancelled) => {
        expect(
          normalizeDeparture(
            createRawDeparture({ canceled }),
          )?.cancelled,
        ).toBe(expectedCancelled);
      },
    );

    it("returns null for an invalid timestamp or delay", () => {
      expect(
        normalizeDeparture(
          createRawDeparture({ time: "invalid" }),
        ),
      ).toBeNull();
      expect(
        normalizeDeparture(
          createRawDeparture({ delay: "invalid" }),
        ),
      ).toBeNull();
    });
  });
});
