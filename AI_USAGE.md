# AI Usage Report

## Tools Used

- ChatGPT
- Codex in Cursor

No other AI tools were used for this project.

## What AI Was Used For

AI assistance was used as a development and review aid for:

- understanding the technical challenge and its acceptance criteria
- planning the React, Express, and TypeScript architecture
- generating and refining implementation prompts
- scaffolding TypeScript and Express code
- reviewing iRail station and Liveboard response shapes
- designing the normalized API response
- checking timestamp, delay, and cancellation conversions
- drafting automated test cases
- reviewing accessibility and keyboard behavior
- iterating on the railway-board frontend styling
- preparing project documentation
- auditing task compliance, caching, repository hygiene, and Git state

## Representative Prompts

The following concise prompts represent the main areas of AI-assisted work:

### Initial architecture

> Design a small React and Express TypeScript application for a train tracker. Keep route, controller, service, normalization, and UI responsibilities separate, and document the response shape.

### iRail station integration

> Integrate the iRail station list and find every station whose English or standard name contains a case-insensitive substring of at least three trimmed characters.

### Liveboard normalization

> Convert iRail Liveboard departures into stable application fields for train number, destination, scheduled ISO time, delay minutes, and cancellation status.

### Inclusive 15-minute filtering

> Filter by scheduled time from one shared request timestamp through exactly 15 minutes later, including both boundaries and converting iRail seconds to JavaScript milliseconds.

### Batching and partial failures

> Process Liveboards in controlled batches of three. Use `Promise.allSettled` so successful stations remain available with warnings, but return an upstream error when every matching Liveboard fails.

### Automated tests

> Add focused tests for query validation, normalization, inclusive boundaries, substring matching, partial failures, batching, raw cache expiry, in-flight request reuse, and the absence of a public station endpoint.

### Local autocomplete

> Add accessible station autocomplete using bundled frontend data only. Show suggestions after three characters, keep typing free of network requests, and use the existing departures endpoint only after selection or explicit search.

### Final task compliance audit

> Audit the implementation against the technical challenge without adding bonus features. Verify routes, caching boundaries, fresh request timestamps, tests, generated files, documentation, and Git hygiene.

### Frontend railway-board redesign

> Refine the frontend into a compact, professional railway information product with a navy identity, restrained surfaces, integrated autocomplete, grouped station tables, 24-hour times, clear statuses, and no horizontal mobile overflow.

## What Was Accepted As-Is

After review and verification, the following categories of AI-assisted output were largely accepted:

- basic React, Vite, Express, and TypeScript project scaffolding
- some application and iRail TypeScript interfaces
- the initial Vitest and Supertest setup
- repetitive CSS declarations and documentation formatting

Acceptance was based on typechecks, tests, builds, runtime inspection, and comparison with the challenge brief rather than on the fact that the output was AI-generated.

## What Was Reviewed or Rewritten

The following areas received substantial manual review, correction, or rewriting:

- the final API response shape and field names
- route, controller, service, and normalization boundaries
- iRail timestamp conversion and inclusive time-window logic
- delay conversion from seconds to minutes
- cancellation conversion to a boolean
- Liveboard batching, partial failure handling, and cache scope
- frontend layout, density, responsive behavior, and visual identity
- local autocomplete request behavior and keyboard interaction
- loading, error, empty, delayed, on-time, and cancelled states
- automated tests and release documentation

## What Was Rejected

The following AI suggestions or directions were explicitly rejected or corrected:

- adding a second public `/api/stations` endpoint
- caching the final filtered departure response for 20 seconds
- automatically starting the expensive full departure search after the third typed character
- copying Deutsche Bahn branding or its exact visual design
- prioritizing fuzzy search before the core substring-search requirements
- changes that could not be explained, tested, or verified against the brief

## Verification and Ownership

- Generated code was reviewed before inclusion.
- Backend tests, typechecks, and production builds were run.
- Frontend lint, typechecks, and production builds were run.
- The real iRail integration and frontend flows were manually tested.
- Suggestions that conflicted with the technical challenge were changed or rejected.
- The final architecture, behavior, trade-offs, and limitations are understood and owned by the candidate.

## Conversation Links

Public conversation links are not available. Representative prompts and the main acceptance, rewrite, and rejection decisions are included in this document instead.
