export interface IRailStation {
  id: string;
  name: string;
  standardname: string;
}

export interface IRailStationsResponse {
  station: IRailStation[];
}
