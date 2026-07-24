interface EmptyResultsProps {
  stationCount: number;
}

export function EmptyResults({
  stationCount,
}: EmptyResultsProps) {
  const stationLabel =
    stationCount === 1
      ? "1 matched station has"
      : `${stationCount} matched stations have`;

  return (
    <section
      className="no-departures"
      aria-labelledby="empty-results-heading"
      role="status"
    >
      <span className="empty-symbol" aria-hidden="true">
        —
      </span>
      <div>
        <h2 id="empty-results-heading">
          No upcoming departures
        </h2>
        <p>
          {stationLabel} no departures in the next 15
          minutes. Try another station or search again
          shortly.
        </p>
      </div>
    </section>
  );
}
