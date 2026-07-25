import type { DeparturesSearchResult } from "../types/departure";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  "http://localhost:3000";

const DEPARTURES_API_URL =
  `${API_BASE_URL.replace(/\/+$/, "")}/api/departures`;

interface ErrorResponse {
  error?: {
    message?: unknown;
  };
}

export async function searchDepartures(
  query: string,
  signal?: AbortSignal,
): Promise<DeparturesSearchResult> {
  const encodedQuery = encodeURIComponent(query);
  const response = await fetch(
    `${DEPARTURES_API_URL}?q=${encodedQuery}`,
    {
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  if (!response.ok) {
    let message =
      `Departure search failed with status ${response.status}.`;

    try {
      const data = (await response.json()) as ErrorResponse;

      if (
        typeof data.error?.message === "string" &&
        data.error.message.length > 0
      ) {
        message = data.error.message;
      }
    } catch {
      // Use the status-based fallback for a non-JSON response.
    }

    throw new Error(message);
  }

  return (await response.json()) as DeparturesSearchResult;
}
