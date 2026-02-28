# OODA Kanban

## Rules

**Always run all tests before making changes.** If tests fail, fix them before proceeding.

**New code must maintain 80% coverage** (lines, branches, and functions). `npm test` enforces this — it will fail if coverage drops below the threshold.

## Run

```bash
npm run dev       # start with auto-restart on file changes
npm start         # start without watch
```

Server runs at http://localhost:3000.

## Test

```bash
npm test
```

Runs all tests and enforces ≥80% coverage (lines, branches, functions). Fails if either tests fail or coverage drops below the threshold.

**Backend** (`server.test.js`) — uses Node's built-in `node:test`. Import `createApp()` from `app.js` to get a fresh isolated instance per suite.

**Frontend** (`frontend.test.js`) — uses [Happy DOM](https://github.com/capricorn86/happy-dom) to emulate the browser in Node. Globals (`HTMLElement`, `customElements`, `CustomEvent`, `fetch`) are set up before the component modules are dynamically imported.

## Coverage

Coverage is reported inline when running `npm test`:

```
file              | line % | branch % | funcs % | uncovered lines
------------------------------------------------------------------
app.js            | 100.00 |   100.00 |  100.00 |
public            |        |          |         |
 components       |        |          |         |
  kanban-board.js | 100.00 |    95.45 |  100.00 |
  kanban-card.js  | 100.00 |   100.00 |  100.00 |
```

- `server.js` is excluded — it only calls `serve()` and cannot be unit tested.
- Add backend tests in `server.test.js` for new routes/logic in `app.js`.
- Add frontend tests in `frontend.test.js` for new component behaviour. Use `makeCard()` / `makeBoard()` helpers and dispatch `CustomEvent`s to simulate user interactions.
