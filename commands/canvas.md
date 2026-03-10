---
name: canvas
description: Spawn interactive terminal canvases for calendars, documents, flights, kanban boards, dashboards, and more
---

# Canvas Command

Spawn and control interactive terminal displays (TUIs) in tmux split panes via the canvas plugin tools.

## Usage

When the user invokes `/canvas`, help them spawn the appropriate canvas type based on their needs.

## Workflow

### Step 1: Determine Canvas Type

Ask what kind of canvas the user needs, or infer from context:

**Business:**
- `kanban` — Task management board
- `pipeline` — CRM sales pipeline
- `dashboard` — Multi-widget dashboard with charts and KPIs
- `invoice` — Invoice generator
- `gantt` — Project timeline
- `org-chart` — Organization hierarchy

**Travel:**
- `hotel` — Hotel search and comparison
- `itinerary` — Trip planning
- `flight` — Flight comparison and seat selection

**Personal:**
- `budget` — Budget tracking
- `smart-home` — IoT device dashboard
- `workout` — Exercise planning and tracking

**Creative:**
- `playlist` — Music playlist builder

**Development:**
- `git-diff` — Diff viewer

**AI:**
- `agent-dashboard` — Agent monitoring

**Original:**
- `calendar` — Display events or pick meeting times
- `document` — View or edit markdown content

If unsure, call `canvas_list` to show all available types with descriptions.

### Step 2: Gather Configuration

Collect the necessary configuration for the chosen canvas type. Refer to the relevant skill for the full config schema:

- `canvas` skill — Config examples for all 17 types
- `canvas-calendar` skill — Calendar and meeting-picker config
- `canvas-document` skill — Document display/edit/email-preview config
- `canvas-flight` skill — Flight and seatmap config
- `canvas-ultra` skill — Detailed feature info for the 14 ultra types

### Step 3: Spawn the Canvas

Use `canvas_spawn` with the canvas type, config JSON, and optional scenario/id:

```
canvas_spawn(
  kind: "<type>",
  config: '<json>',
  scenario: "<scenario>",   // optional
  id: "<canvas-id>"         // optional, defaults to <kind>-1
)
```

**Examples:**

```
# Kanban board
canvas_spawn(kind: "kanban", config: '{"columns": [...]}')

# Calendar display
canvas_spawn(kind: "calendar", scenario: "display", config: '{"events": [...]}')

# Meeting picker
canvas_spawn(kind: "calendar", scenario: "meeting-picker", id: "calendar-1", config: '{"calendars": [...]}')

# Document editor
canvas_spawn(kind: "document", scenario: "edit", id: "document-1", config: '{"content": "# Title", "title": "Doc"}')

# Flight booking
canvas_spawn(kind: "flight", scenario: "booking", id: "flight-1", config: '{"flights": [...]}')

# Dashboard
canvas_spawn(kind: "dashboard", config: '{"widgets": [...]}')
```

### Step 4: Handle Results

After spawning, wait for user interaction then retrieve results as needed:

- **Get selection** (calendar meeting-picker, hotel, flight, etc.):
  ```
  canvas_selection(id: "<canvas-id>")
  ```

- **Get document content**:
  ```
  canvas_content(id: "<canvas-id>")
  ```

- **Push updated data** to a running canvas:
  ```
  canvas_update(id: "<canvas-id>", config: '<updated-json>')
  ```

## Requirements

- tmux is required for canvas spawning (the plugin auto-starts a session if not running)
- Terminal should support mouse input for interactive scenarios (meeting-picker, document edit, flight booking)
