export interface IRailStation {
  id: string;
  name: string;
  standardname: string;
}

export interface IRailStationsResponse {
  station: IRailStation[];
}

export interface IRailVehicleInfo {
  name?: string;
  shortname?: string;
  number?: string;
  type?: string;
}

export interface IRailDeparture {
  id: string;
  station: string;
  time: string | number;
  delay: string | number;
  canceled: string | number;
  left?: string | number;
  isExtra?: string | number;
  vehicle: string;
  vehicleinfo?: IRailVehicleInfo;
  platform?: string;
}

export interface IRailDeparturesCollection {
  number: string | number;
  departure?: IRailDeparture[];
}

export interface IRailLiveboardResponse {
  station: string;
  departures: IRailDeparturesCollection;
}

export interface IRailLiveboardResult {
  stationName: string;
  departures: IRailDeparture[];
}
