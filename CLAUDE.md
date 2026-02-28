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

## Browser automation (agent-browser)

[`agent-browser`](https://github.com/steel-dev/agent-browser) is available for live browser inspection and manual verification against the running app.

**Start the server first:**
```bash
npm run dev
```

**Key commands:**
```bash
agent-browser open http://localhost:3000      # open the app
agent-browser snapshot -i                    # interactive elements + refs (use this to orient)
agent-browser click @e4                      # click element by ref from snapshot
agent-browser fill @e4 "My new task"         # clear and type into a field
agent-browser press Enter                    # send a key
agent-browser get text @e1                   # read text content of an element
agent-browser screenshot shot.png --full     # full-page screenshot
agent-browser eval "document.title"          # run arbitrary JS
```

**Typical workflow for verifying a new feature:**
1. `agent-browser open http://localhost:3000`
2. `agent-browser snapshot -i` — find the refs for the elements you want to interact with
3. Issue `click`, `fill`, `press` commands using `@ref` notation
4. `agent-browser snapshot -i` again to confirm the UI updated correctly
