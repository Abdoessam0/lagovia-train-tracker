# Lagovia Train Tracker Architecture

## Stack

* React with TypeScript
* Node.js with Express and TypeScript
* iRail API

## Data Flow

User → React → Express → iRail → Express filtering → React

## Public Endpoint

```http
GET /api/departures?q=Bru
```

## Responsibilities

### React

React handles the user interface.

It allows the user to:

* Enter part of a Belgian station name.
* Submit the search.
* See a loading state.
* See error and empty-result messages.
* View departures grouped by station.

### Express

Express handles the application logic.

It is responsible for:

* Validating the search query.
* Rejecting queries shorter than three characters.
* Fetching the station list from iRail.
* Finding all stations whose names contain the search text.
* Fetching departures for every matched station.
* Filtering departures scheduled within the next 15 minutes.
* Converting iRail data into a consistent JSON response.
* Handling external API and server errors.

### iRail

iRail provides:

* Belgian railway station information.
* Live departure information.
* Train numbers.
* Destinations.
* Scheduled departure times.
* Delays.
* Cancellation status.

## Departure Time Window

The backend records the current time when it receives the request.

It calculates the end of the time window by adding 15 minutes.

```ts
const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

const now = Date.now();
const windowEnd = now + FIFTEEN_MINUTES_IN_MS;
```

iRail departure timestamps use seconds, while JavaScript `Date.now()` uses milliseconds.

The iRail timestamp must therefore be multiplied by `1000`.

```ts
const departureTime = Number(departure.time) * 1000;
```

A departure is included when its scheduled time is between the current time and the end of the 15-minute window.

```ts
const isInsideWindow =
  departureTime >= now &&
  departureTime <= windowEnd;
```

## Request Flow

1. The user enters at least three characters.
2. React sends a request to Express.
3. Express validates the query.
4. Express gets the Belgian station list from iRail.
5. Express finds every matching station.
6. Express gets departures for each matching station.
7. Express keeps departures scheduled within the next 15 minutes.
8. Express returns normalized JSON.
9. React displays the results grouped by station.

## Proposed Response

```json
{
  "query": "Bru",
  "generatedAt": "2026-07-22T18:30:00.000Z",
  "windowMinutes": 15,
  "stations": [
    {
      "id": "BE.NMBS.008814001",
      "name": "Brussels-South",
      "departures": [
        {
          "trainNumber": "IC3033",
          "destination": "Antwerp-Central",
          "scheduledDepartureTime": "2026-07-22T18:40:00.000Z",
          "delayMinutes": 5,
          "cancelled": false
        }
      ]
    }
  ],
  "totalStations": 1,
  "totalDepartures": 1
}
```

## Error Cases

The application handles:

* Missing search queries.
* Queries shorter than three characters.
* No matching stations.
* Stations with no departures during the next 15 minutes.
* iRail connection failures.
* iRail request timeouts.
* Invalid data returned by iRail.
* Unexpected internal server errors.
