# UX Contract and Frame Decisions

## Product hypothesis

This is an internal operational workspace that may later coexist with public content. A user needs to understand current work, find an item, inspect it, and run one safe representative action from desktop or mobile.

## Top tasks

1. See what needs attention on Overview.
2. Find an item with URL-preserved search, status filtering, and sorting.
3. Inspect the item and run a structured validation action, then recover from success or failure without losing context.

## Representative journey

`Overview → Collection → Detail → Validate → structured result → browser Back restores collection query`

The screen has a mock adapter and an HTTP adapter behind the same generated OpenAPI types. The default local UI uses fixtures so review can proceed before an API is running. Docker production builds use the FastAPI adapter through same-origin `/api/v1/*`.

## Responsive and accessibility decisions

- Desktop uses a persistent sidebar; mobile uses a labeled drawer closed by Escape or its backdrop.
- Collection filters are a desktop row and a mobile bottom sheet.
- Every primary control has a visible focus indicator and a minimum 44px target.
- A skip link, semantic landmarks, status announcements, and reduced-motion behavior are included.
- Code can scroll internally; the document never relies on horizontal page scrolling.
- Light, dark, and system theme preferences are persisted locally.

## Intentional boundaries

- No authentication, database, Redis, queue, GraphQL, or WebSocket is added prematurely.
- The API never executes user-supplied Python. The action endpoint is a deterministic service operation with typed request and result models.
- Long-running work can later add job, SSE, cancellation, and isolated worker contracts without changing the page shell.
