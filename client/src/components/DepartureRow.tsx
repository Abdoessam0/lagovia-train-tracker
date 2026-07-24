import type { Departure } from "../types/departure";

interface DepartureRowProps {
  departure: Departure;
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const fullDateTimeFormatter = new Intl.DateTimeFormat(
  undefined,
  {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  },
);

export function DepartureRow({
  departure,
}: DepartureRowProps) {
  const scheduledDate = new Date(
    departure.scheduledDepartureTime,
  );
  const hasValidScheduledTime = !Number.isNaN(
    scheduledDate.getTime(),
  );
  const readableTime = hasValidScheduledTime
    ? timeFormatter.format(scheduledDate)
    : departure.scheduledDepartureTime;
  const fullDateTime = hasValidScheduledTime
    ? fullDateTimeFormatter.format(scheduledDate)
    : departure.scheduledDepartureTime;

  let delayLabel = "On time";
  let delayClassName = "service-status is-on-time";

  if (departure.delayMinutes > 0) {
    delayLabel = `Delayed by ${departure.delayMinutes} min`;
    delayClassName = "service-status is-delayed";
  } else if (departure.delayMinutes < 0) {
    delayLabel =
      `Early by ${Math.abs(departure.delayMinutes)} min`;
  }

  return (
    <li
      className={
        departure.cancelled
          ? "service-line is-cancelled"
          : "service-line"
      }
      role="row"
    >
      <div className="service-time" role="cell">
        <time
          dateTime={departure.scheduledDepartureTime}
          title={fullDateTime}
        >
          {readableTime}
        </time>
      </div>

      <div className="service-train-cell" role="cell">
        <span className="service-train">
          {departure.trainNumber}
        </span>
      </div>

      <div className="service-journey" role="cell">
        <strong className="service-destination">
          {departure.destination}
        </strong>
      </div>

      <div className="service-state" role="cell">
        {departure.cancelled ? (
          <strong className="service-status is-cancelled">
            Cancelled
          </strong>
        ) : (
          <span className={delayClassName}>{delayLabel}</span>
        )}
      </div>
    </li>
  );
}
