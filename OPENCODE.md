# OpenCode Canvas Plugin — Project Status

## Goal

Adapt the `feature/canvas-ultra` branch of `consigcody94/claude-canvas` from a
Claude Code plugin into an OpenCode plugin, preserving all 17 canvas types and
the full tmux/IPC runtime. The adaptation is designed as a thin adapter layer —
the `canvas/` directory is untouched so upstream changes can be pulled in with
minimal merge effort.

**Repo:** `birchb/claude-canvas` fork of `consigcody94/claude-canvas`  
**Active branch:** `feat/opencode-plugin`  
**Plugin location:** `~/Development/OpenCode/opencode-canvas`  
**Plugin loaded via:** symlink `~/.config/opencode/plugins/canvas.ts -> index.ts`

---

## Architecture

```
opencode-canvas/
├── index.ts              ← OpenCode plugin entry point (OUR CODE)
├── canvas/               ← Upstream TUI runtime — DO NOT MODIFY
│   ├── src/cli.ts        ← CLI interface (spawn, update, selection, content, env)
│   ├── src/terminal.ts   ← tmux detection and pane management
│   ├── src/canvases/     ← 17 React/Ink canvas components + registry
│   └── src/ipc/          ← Unix socket IPC
├── skills/               ← OpenCode-adapted skills (also installed globally)
│   ├── canvas/SKILL.md
│   ├── canvas-ultra/SKILL.md
│   ├── canvas-calendar/SKILL.md
│   ├── canvas-document/SKILL.md
│   └── canvas-flight/SKILL.md
├── commands/
│   └── canvas.md         ← OpenCode /canvas command (also installed globally)
└── package.json          ← name: opencode-canvas, main: index.ts
```

**Design principle:** `index.ts` shells out to `canvas/src/cli.ts` via
`execFileSync`. The CLI is the stable interface. React/Ink internals are never
imported by the plugin.

---

## Plugin Tools (5)

| Tool | Purpose |
|------|---------|
| `canvas_spawn` | Spawn a canvas in a tmux split pane |
| `canvas_update` | Push updated config to a running canvas via IPC |
| `canvas_selection` | Get user's selection from a canvas via IPC |
| `canvas_content` | Get document content from a canvas via IPC |
| `canvas_list` | List all 17 available canvas types |

---

## Canvas Types (17)

| Category | Types |
|----------|-------|
| Business | kanban, pipeline, dashboard, invoice, gantt, org-chart |
| Travel | hotel, itinerary |
| Personal | budget, smart-home, workout |
| Creative | playlist |
| Development | git-diff |
| AI | agent-dashboard |
| Original | calendar, document, flight |

---

## Phase Completion Status

| Phase | Task | Status |
|-------|------|--------|
| 1 | Clone `feature/canvas-ultra`, install deps, remove Claude Code files | ✅ Done |
| Git | Fork to `birchb`, set `upstream` remote, create `feat/opencode-plugin` branch | ✅ Done |
| 2 | Create `index.ts` with 5 plugin tools | ✅ Done |
| 3 | Adapt and install 5 skills globally (`~/.config/opencode/skills/canvas*`) | ✅ Done |
| 4 | Adapt and install `/canvas` command globally (`~/.config/opencode/commands/canvas.md`) | ✅ Done |
| 5 | Register plugin (symlink to `~/.config/opencode/plugins/canvas.ts`) | ✅ Done |
| 6 | Update `package.json` (name, main entry point) | ✅ Done |
| 7 | Testing | 🔄 In progress |

---

## Phase 7 Testing — Current State

### Passing
- Plugin loads cleanly on OpenCode startup (no errors)
- All 5 tools available in session tool list
- `canvas_list` returns all 17 types (confirmed live tool call)
- `canvas_spawn kanban` opens tmux split pane with kanban board ✅
- `canvas_spawn calendar` (meeting-picker) opens and renders ✅
- `canvas_spawn document` (display/edit) opens and renders ✅
- `canvas_selection` retrieves meeting time from calendar ✅
- `canvas_content` retrieves document text ✅
- IPC controller server starts for client-mode canvases ✅
- tmux mouse mode enabled automatically ✅

### Not Yet Tested
- canvas types: pipeline, dashboard, invoice, gantt, org-chart (business)
- canvas types: hotel, itinerary (travel)
- canvas types: budget, smart-home, workout (personal)
- canvas types: playlist (creative), git-diff (development), agent-dashboard (AI)
- canvas types: flight (original)
- IPC round-trip: `canvas_update` (push config to running canvas)
- Edge cases: invalid canvas type, malformed JSON config, tmux not running

---

## Known Upstream Bugs (in `canvas/` directory)

These are bugs in the original PoC code, not in our plugin adapter. They exist
in `consigcody94/claude-canvas` and should be reported/fixed upstream.

### Calendar (`canvas/src/canvases/calendar.tsx`)

1. **↑/↓ arrow keys don't work** — only ←/→ work for week navigation. The
   up/down handlers exist in `meeting-picker-view.tsx` lines 344-359 but don't
   render a visible cursor or respond correctly.

2. **Date shows March 2020** — demo data defaults to old dates instead of
   parsing config or using current date.

### Document (`canvas/src/canvases/document.tsx`)

1. **Mouse tracking prints garbage** — moving the mouse over the document
   prints raw escape sequences as text instead of being interpreted as mouse
   events. The `useMouse` hook in `calendar/hooks/use-mouse.ts` is used but
   doesn't work correctly in document context.

2. **'m' key doesn't respond** — specific key binding issue in the input
   handler.

3. **Input buffering issues** — typing "awesome" may produce "awsoe" with
   letters missing or out of order.

### General

1. **No theme support** — all canvases use hardcoded dark colors. No light
   mode option exists.

---

## Known Bugs Fixed During Development

1. **Plugin not loading** — `file://` paths in `opencode.json` plugin array are
   ignored; local plugins must be placed in `~/.config/opencode/plugins/`.
   Fixed by using a symlink.

2. **`import.meta.dirname` resolves to plugins dir** — when loaded via symlink,
   the dirname points to `~/.config/opencode/plugins/` not the repo. Fixed with
   `realpathSync(import.meta.filename)`.

3. **tmux not found at startup** — `ensureTmux()` was called at plugin init.
   Moving it to lazy init (only on `canvas_spawn`) prevents startup errors.

4. **CLI rejects spawn outside tmux** — `terminal.ts` checks `process.env.TMUX`
   which isn't inherited by OpenCode's subprocess. Fixed by constructing the
   `TMUX` env var via `tmux list-sessions` and passing it explicitly to
   `execFileSync`.

5. **Bun `$` shell can't use `$(cat file)` substitution** — switched
   `canvas_spawn` from Bun shell template to `execFileSync` with config JSON
   passed directly as an argument.

---

## Remaining Work

### Phase 7 (continue testing)
- Test one canvas per remaining category
- Verify IPC round-trip for `canvas_update`, `canvas_selection`, `canvas_content`

### Future Enhancements

**Theme inheritance:** Canvas currently uses hardcoded dark theme colors (see
`calendar.tsx` line 53: `INK_COLORS`). Add support for OpenCode's current theme
(light/dark) to be passed to the canvas so it matches the terminal's appearance.

Approach:
- Pass theme info via `canvas_spawn` config (`theme: "light" | "dark"`)
- Add `--theme` flag to CLI
- Canvas components use theme-aware color maps instead of hardcoded values
- Test edge cases

### Post-testing
- Update `README.md` with OpenCode install instructions and usage examples
- Open PR: `birchb/claude-canvas:feat/opencode-plugin` → `consigcody94/claude-canvas:feature/canvas-ultra`
- Update Obsidian plan note status

---

## Environment

| Item | Value |
|------|-------|
| Plugin path | `~/Development/OpenCode/opencode-canvas` |
| Symlink | `~/.config/opencode/plugins/canvas.ts` |
| Skills | `~/.config/opencode/skills/canvas*` (5 dirs) |
| Command | `~/.config/opencode/commands/canvas.md` |
| tmux | Required; auto-starts session `opencode-canvas` if not in tmux |
| Bun | `/opt/homebrew/bin/bun` |
| tmux | `/opt/homebrew/bin/tmux` (3.6a) |
| Fork | `https://github.com/birchb/claude-canvas` |
| Upstream | `https://github.com/consigcody94/claude-canvas` |
| Active branch | `feat/opencode-plugin` |
