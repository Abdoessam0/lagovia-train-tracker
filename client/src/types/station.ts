export interface StationOption {
  id: string;
  name: string;
  standardName: string;
}

export interface StationsSearchResult {
  query: string;
  totalMatchedStations: number;
  stations: StationOption[];
}
