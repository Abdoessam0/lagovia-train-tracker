import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { getLiveboardForStation } from "../src/services/irail.service.js";

const NOW_MS = Date.UTC(2026, 6, 24, 12, 0, 0);

function createLiveboardResponse(
  stationName: string,
): Response {
  return new Response(
    JSON.stringify({
      station: stationName,
      departures: {
        number: "1",
        departure: [
          {
            id: "departure-id",
            station: "Destination",
            time: NOW_MS / 1000,
            delay: "0",
            canceled: "0",
            vehicle: "BE.NMBS.IC1234",
          },
        ],
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

describe("iRail Liveboard caching", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("caches a raw station Liveboard result for 12 seconds", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        createLiveboardResponse("Liveboard Cache"),
      );
    vi.stubGlobal("fetch", fetchMock);

    const first = await getLiveboardForStation(
      "BE.NMBS.LIVEBOARD.CACHE",
    );
    const second = await getLiveboardForStation(
      "BE.NMBS.LIVEBOARD.CACHE",
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(second).toBe(first);
    expect(first.departures[0]?.delay).toBe("0");
    expect(first.departures[0]?.canceled).toBe("0");

    vi.advanceTimersByTime(12_001);

    await getLiveboardForStation(
      "BE.NMBS.LIVEBOARD.CACHE",
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("deduplicates simultaneous requests for one station", async () => {
    let resolveFetch:
      | ((response: Response) => void)
      | undefined;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const firstRequest = getLiveboardForStation(
      "BE.NMBS.LIVEBOARD.INFLIGHT",
    );
    const secondRequest = getLiveboardForStation(
      "BE.NMBS.LIVEBOARD.INFLIGHT",
    );

    expect(fetchMock).toHaveBeenCalledOnce();

    resolveFetch?.(
      createLiveboardResponse("In-flight Liveboard"),
    );

    const [first, second] = await Promise.all([
      firstRequest,
      secondRequest,
    ]);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(first).toEqual(second);
    expect(first.stationName).toBe(
      "In-flight Liveboard",
    );
  });

  it("removes a failed in-flight request so a later call can retry", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("Network failure"))
      .mockImplementationOnce(async () =>
        createLiveboardResponse("Recovered Liveboard"),
      );
    vi.stubGlobal("fetch", fetchMock);

    const firstRequest = getLiveboardForStation(
      "BE.NMBS.LIVEBOARD.RETRY",
    );
    const duplicateRequest = getLiveboardForStation(
      "BE.NMBS.LIVEBOARD.RETRY",
    );

    await expect(
      Promise.all([firstRequest, duplicateRequest]),
    ).rejects.toThrow("Network failure");
    expect(fetchMock).toHaveBeenCalledOnce();

    const retry = await getLiveboardForStation(
      "BE.NMBS.LIVEBOARD.RETRY",
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(retry.stationName).toBe("Recovered Liveboard");
  });
});
