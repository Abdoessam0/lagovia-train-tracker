export interface Departure {
  trainNumber: string;
  destination: string;
  scheduledDepartureTime: string;
  delayMinutes: number;
  cancelled: boolean;
}

export interface StationDepartures {
  stationId: string;
  stationName: string;
  departures: Departure[];
}

export interface DeparturesSearchResult {
  query: string;
  generatedAt: string;
  windowMinutes: number;
  totalMatchedStations: number;
  totalReturnedStations: number;
  totalDepartures: number;
  partial: boolean;
  warnings: string[];
  stations: StationDepartures[];
}
