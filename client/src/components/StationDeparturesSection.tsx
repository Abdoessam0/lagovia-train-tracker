import { useId } from "react";

import type { StationDepartures } from "../types/departure";
import { DepartureRow } from "./DepartureRow";

interface StationDeparturesSectionProps {
  station: StationDepartures;
}

export function StationDeparturesSection({
  station,
}: StationDeparturesSectionProps) {
  const headingId = useId();
  const departureCount = station.departures.length;

  return (
    <section
      className="station-group"
      aria-labelledby={headingId}
    >
      <header className="station-heading">
        <h3 id={headingId}>{station.stationName}</h3>
        <p>
          {departureCount}{" "}
          {departureCount === 1
            ? "departure"
            : "departures"}
        </p>
      </header>

      <div
        className="service-board"
        role="table"
        aria-label={`Departures from ${station.stationName}`}
      >
        <div className="service-columns" role="row">
          <span role="columnheader">Time</span>
          <span role="columnheader">Train</span>
          <span role="columnheader">Destination</span>
          <span role="columnheader">Status</span>
        </div>

        <ul className="service-lines" role="rowgroup">
          {station.departures.map((departure, index) => (
            <DepartureRow
              key={[
                departure.trainNumber,
                departure.destination,
                departure.scheduledDepartureTime,
                index,
              ].join("-")}
              departure={departure}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
