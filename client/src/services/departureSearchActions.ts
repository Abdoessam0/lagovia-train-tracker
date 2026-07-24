import type { DeparturesSearchResult } from "../types/departure";
import type { StationOption } from "../types/station";
import { searchDepartures } from "./departuresApi";

export type DepartureRequester = (
  query: string,
  signal?: AbortSignal,
) => Promise<DeparturesSearchResult>;

export function searchSelectedStation(
  station: StationOption,
  signal?: AbortSignal,
  request: DepartureRequester = searchDepartures,
): Promise<DeparturesSearchResult> {
  return request(station.name, signal);
}

export function searchTypedStationQuery(
  query: string,
  signal?: AbortSignal,
  request: DepartureRequester = searchDepartures,
): Promise<DeparturesSearchResult> {
  return request(query.trim(), signal);
}
