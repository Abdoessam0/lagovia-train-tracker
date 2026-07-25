import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const EMPTY_RESULT = {
  query: "Bru",
  generatedAt: "2026-07-25T12:00:00.000Z",
  windowMinutes: 15,
  totalMatchedStations: 0,
  totalReturnedStations: 0,
  totalDepartures: 0,
  partial: false,
  warnings: [],
  stations: [],
};

function stubSuccessfulFetch() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue(EMPTY_RESULT),
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

async function loadDeparturesApi(apiBaseUrl: string) {
  vi.stubEnv("VITE_API_BASE_URL", apiBaseUrl);
  vi.resetModules();

  return import("../../client/src/services/departuresApi");
}

describe("client API base URL configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("uses the local API fallback when the Vite variable is blank", async () => {
    const fetchMock = stubSuccessfulFetch();
    const { searchDepartures } = await loadDeparturesApi("   ");

    await searchDepartures("Bru");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/departures?q=Bru",
      expect.any(Object),
    );
  });

  it("uses the production Vite API base URL", async () => {
    const fetchMock = stubSuccessfulFetch();
    const { searchDepartures } = await loadDeparturesApi(
      "  https://api.example.test  ",
    );

    await searchDepartures("Bru");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/departures?q=Bru",
      expect.any(Object),
    );
  });

  it("normalizes trailing slashes before building the request URL", async () => {
    const fetchMock = stubSuccessfulFetch();
    const { searchDepartures } = await loadDeparturesApi(
      "https://api.example.test///",
    );

    await searchDepartures("Bru");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/departures?q=Bru",
      expect.any(Object),
    );
  });
});
