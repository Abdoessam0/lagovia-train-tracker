import type { Departure } from "../types/departure.types.js";
import type { IRailDeparture } from "../types/irail.types.js";

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

export function isDepartureWithinWindow(
  departure: IRailDeparture,
  nowMs: number,
  windowMinutes = 15,
): boolean {
  const departureTimeSeconds = Number(departure.time);

  if (!Number.isFinite(departureTimeSeconds)) {
    return false;
  }

  const departureTimeMs =
    departureTimeSeconds * MILLISECONDS_PER_SECOND;

  const windowEndMs =
    nowMs +
    windowMinutes *
      SECONDS_PER_MINUTE *
      MILLISECONDS_PER_SECOND;

  return (
    departureTimeMs >= nowMs &&
    departureTimeMs <= windowEndMs
  );
}

export function normalizeDeparture(
  departure: IRailDeparture,
): Departure | null {
  const departureTimeSeconds = Number(departure.time);
  const delaySeconds = Number(departure.delay);

  if (
    !Number.isFinite(departureTimeSeconds) ||
    !Number.isFinite(delaySeconds)
  ) {
    return null;
  }

  const destination = departure.station.trim();
  const rawVehicle = departure.vehicle.trim();
  const shortVehicleName =
    departure.vehicleinfo?.shortname?.trim();

  if (
    destination.length === 0 ||
    rawVehicle.length === 0
  ) {
    return null;
  }

  const trainNumber =
    shortVehicleName && shortVehicleName.length > 0
      ? shortVehicleName
      : rawVehicle.replace(/^BE\.NMBS\./, "");

  return {
    trainNumber,
    destination,
    scheduledDepartureTime: new Date(
      departureTimeSeconds * MILLISECONDS_PER_SECOND,
    ).toISOString(),
    delayMinutes: Math.round(
      delaySeconds / SECONDS_PER_MINUTE,
    ),
    cancelled: String(departure.canceled) === "1",
  };
}

export function getUpcomingDepartures(
  departures: IRailDeparture[],
  nowMs = Date.now(),
  windowMinutes = 15,
): Departure[] {
  return departures
    .filter((departure) =>
      isDepartureWithinWindow(
        departure,
        nowMs,
        windowMinutes,
      ),
    )
    .map(normalizeDeparture)
    .filter(
      (departure): departure is Departure =>
        departure !== null,
    )
    .sort(
      (firstDeparture, secondDeparture) =>
        Date.parse(
          firstDeparture.scheduledDepartureTime,
        ) -
        Date.parse(
          secondDeparture.scheduledDepartureTime,
        ),
    );
}
