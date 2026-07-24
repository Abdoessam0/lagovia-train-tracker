# Lagovia Train Tracker Architecture

## System Boundary

Lagovia has one public feature endpoint:

```http
GET /api/departures?q=Bru
```

`GET /health` is a technical process check. There is no public station, search, or autocomplete endpoint.

## Request Flow

```text
React form
  -> GET /api/departures
  -> Express route
  -> departures controller
  -> departures service
  -> cached iRail station list
  -> batched iRail Liveboard requests
  -> scheduled-time filtering
  -> normalized station groups
  -> React departure board
```

The controller trims and validates `q`. The departures service captures one `nowMs` at the start of each valid request, matches every station whose English or standard name contains the substring, and filters all successful Liveboards against that shared clock.

## Frontend Search Paths

Autocomplete is entirely local:

```text
Input with 3+ characters
  -> bundled station data
  -> case-insensitive substring matches
  -> up to eight suggestions
```

Typing never calls the backend. Selecting a suggestion requests that station through `/api/departures`. Submitting typed text such as `Bru` sends the full substring so the backend processes every matching station.

## Time Window and Normalization

iRail timestamps are expressed in seconds. Lagovia converts them to milliseconds and includes a departure when:

```ts
departureTimeMs >= nowMs &&
departureTimeMs <= nowMs + 15 * 60 * 1000
```

Both interval boundaries are inclusive. Each normalized departure contains:

- `trainNumber`
- `destination`
- `scheduledDepartureTime`
- `delayMinutes`
- `cancelled`

Its origin is supplied by the containing `stationId` and `stationName` group.

## Upstream Work and Failures

Matching stations are processed in batches of three, with a short delay between batches to protect the public iRail service.

Each batch uses `Promise.allSettled`:

- successful Liveboards are normalized and returned
- failed Liveboards produce warnings
- the response sets `partial` when some stations fail
- the request fails with HTTP `502` when every matching Liveboard fails

No matches are a successful empty result.

## Caching

The station list is cached in memory because it changes infrequently.

Raw iRail Liveboard results are cached per station for 12 seconds. Concurrent requests for the same uncached station share one in-flight Promise, which is removed after success or failure.

The normalized `/api/departures` response is never cached. Every request:

1. captures a fresh `nowMs`
2. matches stations again
3. filters cached or fresh raw Liveboard data again
4. recalculates station and departure totals
5. produces a new `generatedAt`

This keeps the 15-minute window accurate while limiting redundant upstream traffic.

## Main Modules

- `server/src/routes/departures.routes.ts` - feature route
- `server/src/controllers/departures.controller.ts` - validation and HTTP responses
- `server/src/services/departures.service.ts` - matching, batching, partial failures, totals
- `server/src/services/irail.service.ts` - iRail calls and raw caches
- `server/src/utils/departure.utils.ts` - filtering and normalization
- `client/src/services/stationAutocomplete.ts` - bundled local suggestions
- `client/src/services/departuresApi.ts` - the only frontend feature API call
- `client/src/App.tsx` - search state, request lifecycle, and result composition
