# Lagovia Train Tracker

## Overview

Lagovia Train Tracker is a full-stack railway information application built for the DPS technical challenge. A user enters part of a Belgian station name, and the application returns departures scheduled within the next 15 minutes from every station whose English or standard name contains that substring.

The React frontend consumes a single Express feature endpoint. The backend retrieves live station and departure data from the public [iRail API](https://docs.irail.be/), filters it against one shared request timestamp, and returns normalized results grouped by origin station.

## Features

- Case-insensitive substring station search
- Local, accessible station autocomplete backed by bundled frontend data
- Departure results grouped by origin station
- Delay and cancellation display
- Inclusive scheduled-time window from now through the next 15 minutes
- Partial upstream failure handling with successful results and warnings
- Raw iRail Liveboard caching for 12 seconds
- In-flight request deduplication and controlled iRail request batching
- Responsive React interface with 24-hour timetable display
- Automated backend, service, cache, and client-search tests

## Tech Stack

### Backend

- Node.js
- Express
- TypeScript
- Vitest
- Supertest

### Frontend

- React
- TypeScript
- Vite
- CSS

### External data source

- iRail API

## Project Structure

```
lagovia-train-tracker/
|-- client/
|   |-- public/                 # Static browser assets
|   `-- src/
|       |-- components/         # Departure-board UI components
|       |-- data/               # Bundled autocomplete station data
|       |-- services/           # Local autocomplete and API calls
|       `-- types/              # Frontend response and station types
|-- server/
|   |-- src/
|   |   |-- controllers/        # HTTP validation and responses
|   |   |-- routes/             # Express route definitions
|   |   |-- services/           # Search orchestration and iRail access
|   |   |-- types/              # Application and iRail types
|   |   `-- utils/              # Time-window filtering and normalization
|   `-- tests/                  # Endpoint, service, cache, and utility tests
|-- ARCHITECTURE.md
`-- README.md
```

Generated output and dependencies are intentionally excluded from Git.

## Prerequisites

- Node.js 22
- npm

Node.js 22 is the supported and verified development environment for this submission.

## Installation

From a new clone:

```
git clone https://github.com/Abdoessam0/lagovia-train-tracker.git
cd lagovia-train-tracker
```

Install the backend:

```
cd server
npm ci
```

Install the frontend:

```
cd ../client
npm ci
```

## Running Locally

Start the backend in terminal 1:

```
cd server
npm run dev
```

Start the frontend in terminal 2:

```
cd client
npm run dev
```

Local addresses:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:3000](http://localhost:3000)
- Health check: [http://localhost:3000/health](http://localhost:3000/health)

## API

### Departures

```
GET /api/departures?q=Bru
```

`q` is required. After surrounding whitespace is trimmed, it must contain at least three characters. The search is case-insensitive and matches substrings in both the English station name and iRail standard name.

This is the application's only public feature endpoint. Autocomplete is local to the frontend and does not use a station, search, or autocomplete API route.

#### HTTP statuses


| Status | Meaning                                                               |
| ------ | --------------------------------------------------------------------- |
| `200`  | Search completed, including empty or partially successful results     |
| `400`  | Query is missing or shorter than three trimmed characters             |
| `502`  | The station source failed, or every matching Liveboard request failed |


#### Sample success response

Values below illustrate the response shape and are not fixed live timetable data.

```
{
  "query": "Bru",
  "generatedAt": "2026-07-24T18:00:00.000Z",
  "windowMinutes": 15,
  "totalMatchedStations": 1,
  "totalReturnedStations": 1,
  "totalDepartures": 1,
  "partial": false,
  "warnings": [],
  "stations": [
    {
      "stationId": "BE.NMBS.008813003",
      "stationName": "Brussels-Central",
      "departures": [
        {
          "trainNumber": "IC 1234",
          "destination": "Antwerp-Central",
          "scheduledDepartureTime": "2026-07-24T18:10:00.000Z",
          "delayMinutes": 2,
          "cancelled": false
        }
      ]
    }
  ]
}
```

#### Missing query

```
GET /api/departures
```

```
{
  "error": {
    "code": "QUERY_REQUIRED",
    "message": "Please provide a station search query."
  }
}
```

#### Short query

```
GET /api/departures?q=Br
```

```
{
  "error": {
    "code": "QUERY_TOO_SHORT",
    "message": "Please enter at least 3 characters."
  }
}
```

#### Upstream API failure

If the station request fails, or every matching Liveboard request fails:

```
{
  "error": {
    "code": "UPSTREAM_API_ERROR",
    "message": "Train information is temporarily unavailable."
  }
}
```

#### No matching stations

A completed search with no station matches returns HTTP `200`:

```
{
  "query": "NoSuchStation",
  "generatedAt": "2026-07-24T18:00:00.000Z",
  "windowMinutes": 15,
  "totalMatchedStations": 0,
  "totalReturnedStations": 0,
  "totalDepartures": 0,
  "partial": false,
  "warnings": [],
  "stations": []
}
```

#### Successful partial results

When some matching Liveboards fail, successful station results are still returned with HTTP `200`:

```
{
  "query": "Bru",
  "generatedAt": "2026-07-24T18:00:00.000Z",
  "windowMinutes": 15,
  "totalMatchedStations": 2,
  "totalReturnedStations": 1,
  "totalDepartures": 0,
  "partial": true,
  "warnings": [
    "Departures could not be loaded for Brussels-West."
  ],
  "stations": [
    {
      "stationId": "BE.NMBS.008813003",
      "stationName": "Brussels-Central",
      "departures": []
    }
  ]
}
```

### Health check

```
GET /health
```

This technical endpoint reports that the Express process is available. It does not call iRail.

## Response Field Explanations


|                          |                                                                          |
| ------------------------ | ------------------------------------------------------------------------ |
| Field                    | Description                                                              |
| `query`                  | The trimmed substring processed by the backend                           |
| `generatedAt`            | ISO timestamp for the single `now` value shared by the request           |
| `windowMinutes`          | Scheduled-departure window length, currently `15`                        |
| `totalMatchedStations`   | Number of station names matching the substring                           |
| `totalReturnedStations`  | Number of matching stations whose Liveboards succeeded                   |
| `totalDepartures`        | Sum of all filtered departure arrays                                     |
| `partial`                | `true` when at least one matching Liveboard failed but another succeeded |
| `warnings`               | Human-readable messages for station Liveboards that failed               |
| `stations`               | Successful station groups, sorted by station name                        |
| `stationId`              | iRail identifier for the origin station                                  |
| `stationName`            | Display name for the origin station                                      |
| `departures`             | Departures scheduled within the inclusive request window                 |
| `trainNumber`            | Normalized iRail vehicle short name or number                            |
| `destination`            | Destination station name                                                 |
| `scheduledDepartureTime` | Scheduled departure as an ISO timestamp                                  |
| `delayMinutes`           | iRail delay converted from seconds to rounded minutes                    |
| `cancelled`              | Normalized cancellation boolean                                          |


## Testing

Backend:

```
cd server
npm test
npm run typecheck
npm run build
```

Frontend:

```
cd client
npm run lint
npx --no-install tsc -b
npm run build
```

## Architecture and Request Flow

```
React search
  -> Express route
  -> departures controller
  -> departures service
  -> cached iRail station list
  -> batched iRail Liveboards
  -> inclusive 15-minute filter
  -> normalized grouped JSON
  -> React departure board
```

The frontend autocomplete is a separate local path:

```
Typed characters -> bundled station data -> up to eight suggestions
```

Typing does not start the full departure search. Selecting a station or explicitly submitting the form uses the existing `/api/departures` endpoint.

## Key Decisions

- **Route -> Controller -> Service separation:** routing remains small, HTTP validation stays in the controller, and search orchestration lives in the service.
- **Normalized application data:** the frontend receives a stable, documented model rather than raw iRail response fields.
- **One shared** `nowMs` **per request:** every station is filtered against the same inclusive interval.
- `Promise.allSettled` **for each batch:** one failed Liveboard does not discard successful station results.
- **Batches of three Liveboard requests:** broad substring searches respect iRail's public rate limits, with a short delay between batches.
- **Raw Liveboard caching for 12 seconds:** repeated calls avoid unnecessary upstream work without caching filtered application results.
- **In-flight Promise deduplication:** concurrent requests for the same station share one Liveboard request, and the Promise is removed after settlement.
- **Local autocomplete:** bundled station data keeps typing responsive while preserving one public feature endpoint.
- **24-hour timetable display:** times use an explicit `h23` hour cycle for railway-style scanning.

## Trade-offs and Known Limitations

- Bundled station suggestion data can become stale until the frontend data file is refreshed.
- The autocomplete dataset increases the frontend bundle size.
- Raw Liveboard data can be up to 12 seconds old.
- Broad substring queries can be slower because every matching station is processed while respecting iRail limits.
- Caches are in memory, so state is not shared across multiple server processes and resets when the process restarts.
- Search is substring-based rather than fuzzy because fuzzy matching was a bonus and the core requirements were prioritized.
- The frontend API address is configured for local development.
- No deployment is included because the challenge requires a public repository, not a hosted application.

## Accessibility

- The search input has an associated label and descriptive guidance.
- Autocomplete supports Arrow Up, Arrow Down, Enter, and Escape.
- Interactive elements have visible focus states.
- Loading and error feedback use live regions.
- Headings, station sections, and departure rows expose semantic structure.
- Status is communicated with text as well as color.
- The mobile layout avoids horizontal overflow.

## AI Usage

See [AI_USAGE.md](AI_USAGE.md) for the required transparent account of AI-assisted work, representative prompts, review decisions, and verification.

## Data Attribution

Live Belgian railway information is provided by the public [iRail API](https://docs.irail.be/).
