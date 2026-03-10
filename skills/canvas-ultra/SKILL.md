---
name: canvas-ultra
description: |
  Catalog of the 14 ultra canvas types with feature details and shared component library.
  Use when you need detailed feature information about a specific ultra canvas type before spawning it,
  or when building complex configurations for business, travel, personal, creative, development, or AI canvases.
---

# Canvas Ultra — Type Catalog

A comprehensive collection of interactive terminal canvases. Use `canvas_spawn` to launch any of these.

## Business Canvases

### Kanban Board (`kanban`)
Interactive task management board with drag-and-drop cards between columns.

**Features:**
- Multiple columns with WIP limits
- Card details (priority, labels, assignee, due dates)
- Drag and drop reordering
- Keyboard shortcuts for quick actions

```json
{"columns": [{"id": "todo", "title": "To Do", "wipLimit": 5, "cards": [{"id": "1", "title": "Task 1", "priority": "high", "labels": ["bug"]}]}, {"id": "doing", "title": "In Progress", "cards": []}, {"id": "done", "title": "Done", "cards": []}]}
```

---

### Sales Pipeline (`pipeline`)
CRM-style deal management with stages and probability tracking.

**Features:**
- Visual funnel representation
- Deal cards with value and probability
- Drag deals between stages (auto-updates probability)
- Weighted pipeline value calculation

```json
{"stages": [{"id": "lead", "name": "Lead", "probability": 10, "deals": [{"id": "1", "title": "Acme Corp", "value": {"amount": 50000, "currency": "USD"}, "probability": 10}]}, {"id": "qualified", "name": "Qualified", "probability": 25, "deals": []}]}
```

---

### Dashboard (`dashboard`)
Multi-widget dashboard with charts, stats, and KPIs.

**Widget Types:**
- `stat` — KPI cards with trends and sparklines
- `chart-bar` — Horizontal/vertical bar charts
- `chart-line` — Line/sparkline charts
- `chart-pie` — Pie/donut charts
- `gauge` — Progress gauges
- `progress` — Multiple progress bars
- `table` — Data tables
- `list` — Simple lists

```json
{"title": "Sales Dashboard", "widgets": [{"id": "1", "type": "stat", "title": "Revenue", "data": {"value": 125000, "trend": 12}}, {"id": "2", "type": "chart-bar", "title": "Monthly Sales", "data": [{"label": "Jan", "value": 10000}]}, {"id": "3", "type": "gauge", "title": "Goal", "data": {"value": 75, "max": 100}}]}
```

---

### Invoice (`invoice`)
Invoice generator and viewer with line items and calculations.

**Features:**
- Professional invoice layout
- Line item management
- Auto-calculated totals and tax
- Multiple status states: `draft`, `sent`, `paid`, `overdue`, `cancelled`

```json
{"invoice": {"number": "INV-001", "status": "draft", "from": {"name": "My Company", "address": "123 Main St"}, "to": {"name": "Client Corp", "address": "456 Oak Ave"}, "items": [{"id": "1", "description": "Consulting", "quantity": 10, "unitPrice": {"amount": 15000, "currency": "USD"}}], "taxRate": 0.1}}
```

---

### Gantt Chart (`gantt`)
Project timeline visualization with tasks and milestones.

**Features:**
- Day/week/month views
- Task bars with progress indicators
- Milestone markers
- Dependency visualization

```json
{"project": {"id": "1", "name": "Product Launch", "startDate": "2024-01-01", "status": "active", "owner": {"id": "1", "name": "PM"}, "team": [], "tasks": [{"id": "t1", "title": "Design", "status": "completed", "progress": 100, "dueDate": "2024-01-15"}, {"id": "t2", "title": "Development", "status": "in-progress", "progress": 50, "dueDate": "2024-02-01"}], "milestones": [{"id": "m1", "title": "Beta Release", "dueDate": "2024-02-15", "status": "pending"}]}}
```

---

### Org Chart (`org-chart`)
Organization hierarchy visualization.

**Features:**
- Tree structure navigation
- Expand/collapse nodes
- Employee details panel
- Report count display

```json
{"root": {"id": "ceo", "person": {"id": "1", "name": "Jane Smith", "email": "jane@company.com"}, "title": "CEO", "children": [{"id": "cto", "person": {"id": "2", "name": "Bob Johnson"}, "title": "CTO", "children": []}, {"id": "cfo", "person": {"id": "3", "name": "Alice Williams"}, "title": "CFO", "children": []}]}}
```

---

## Travel Canvases

### Hotel Search (`hotel`)
Hotel comparison and booking interface.

**Features:**
- Hotel list with ratings and prices
- Room type selection
- Amenity display
- Compare mode (up to 3 hotels)

```json
{"checkIn": "2024-03-15", "checkOut": "2024-03-20", "guests": 2, "rooms": 1, "hotels": [{"id": "1", "name": "Grand Hotel", "rating": 4.5, "stars": 5, "location": {"city": "Paris", "country": "France"}, "amenities": ["wifi", "pool", "spa"], "roomTypes": [{"id": "r1", "name": "Deluxe Room", "pricePerNight": {"amount": 25000, "currency": "USD"}, "maxGuests": 2}]}]}
```

---

### Itinerary (`itinerary`)
Trip planning with day-by-day activities.

**Features:**
- Day overview grid
- Activity timeline per day
- Drag to reorder activities
- Cost tracking per activity and total

```json
{"itinerary": {"id": "1", "title": "Tokyo Trip", "startDate": "2024-04-01", "endDate": "2024-04-07", "days": [{"date": "2024-04-01", "activities": [{"id": "a1", "title": "Arrive Narita", "time": "14:00", "duration": 60, "type": "transport", "cost": {"amount": 1500, "currency": "USD"}}]}]}}
```

---

## Personal Canvases

### Budget Tracker (`budget`)
Personal/business budget tracking with categories.

**Features:**
- Category spending vs budget
- Visual progress bars
- Pie chart breakdown
- Transaction list

```json
{"budget": {"id": "1", "name": "Monthly Budget", "period": "monthly", "startDate": "2024-01-01", "endDate": "2024-01-31", "categories": [{"id": "1", "name": "Housing", "budgeted": {"amount": 200000, "currency": "USD"}, "spent": {"amount": 150000, "currency": "USD"}, "color": "blue"}, {"id": "2", "name": "Food", "budgeted": {"amount": 50000, "currency": "USD"}, "spent": {"amount": 45000, "currency": "USD"}, "color": "green"}]}}
```

---

### Smart Home (`smart-home`)
IoT device dashboard and control panel.

**Features:**
- Room-based organization
- Device controls (toggle, brightness, temperature)
- Status indicators (online/offline)
- Automation management

```json
{"rooms": ["Living Room", "Bedroom", "Kitchen"], "devices": [{"id": "1", "name": "Main Light", "type": "light", "room": "Living Room", "status": "online", "capabilities": ["on-off", "brightness"]}, {"id": "2", "name": "Thermostat", "type": "thermostat", "room": "Living Room", "status": "online", "capabilities": ["temperature"]}]}
```

---

### Workout (`workout`)
Exercise planning and tracking.

**Features:**
- Exercise list with sets/reps/weight
- Active workout mode with timer
- Rest timer between sets
- Session progress tracking

```json
{"workout": {"id": "1", "name": "Push Day", "exercises": [{"id": "e1", "name": "Bench Press", "sets": [{"reps": 10, "weight": 135}, {"reps": 8, "weight": 145}]}, {"id": "e2", "name": "Push-ups", "sets": [{"reps": 20}, {"reps": 20}]}]}}
```

---

## Creative Canvases

### Playlist (`playlist`)
Music playlist builder and player.

**Features:**
- Track list with duration
- Now playing indicator
- Drag to reorder tracks
- Shuffle mode toggle

```json
{"playlist": {"id": "1", "name": "Focus Mix", "tracks": [{"id": "t1", "title": "Song One", "artist": "Artist A", "duration": 213}, {"id": "t2", "title": "Song Two", "artist": "Artist B", "duration": 187}]}}
```

---

## Development Canvases

### Git Diff (`git-diff`)
Side-by-side diff viewer for git changes.

**Features:**
- Unified and split view modes
- File list with status indicators (`modified`, `added`, `deleted`, `renamed`)
- Line-by-line navigation
- Stage/unstage actions

```json
{"files": [{"path": "src/index.ts", "status": "modified", "additions": 10, "deletions": 5, "hunks": [{"oldStart": 1, "oldLines": 5, "newStart": 1, "newLines": 10, "lines": [{"type": "context", "content": "import React from \"react\";"}, {"type": "deletion", "content": "const old = true;"}, {"type": "addition", "content": "const updated = false;"}]}]}]}
```

---

## AI Canvases

### Agent Dashboard (`agent-dashboard`)
Monitor and manage AI agents.

**Features:**
- Agent status overview (running/paused/completed/failed)
- Progress tracking per agent
- Log viewer with level filtering (info/warn/error)
- Token usage monitoring
- Context window visualization

```json
{"agents": [{"id": "1", "name": "Research Agent", "status": "running", "progress": 65, "currentTask": "Analyzing documents", "logs": [{"timestamp": "2024-01-15T10:30:00Z", "level": "info", "message": "Started task"}], "context": {"tokensUsed": 50000, "maxTokens": 100000}}]}
```

---

## Shared Component Library

The canvas runtime includes reusable components available to all canvas types:

### Data Display
- `DataTable` — Sortable, filterable tables
- `BarChart`, `LineChart`, `PieChart` — Charts
- `Gauge`, `Sparkline`, `ProgressBar` — Metrics
- `Heatmap` — Grid visualizations

### Forms
- `TextInput`, `Select`, `MultiSelect` — Input components
- `Checkbox`, `RadioGroup` — Selection components
- `Slider`, `Rating` — Range components
- `DatePicker`, `TimePicker` — Date/time components

### Layout
- `Panel`, `Tabs`, `SplitPane` — Container components
- `Accordion`, `Modal`, `Drawer` — Overlay components
- `List`, `Tree` — Navigation components

## Keyboard Shortcuts

Common shortcuts across all ultra canvases:

| Key | Action |
|-----|--------|
| `Up/Down` | Navigate items |
| `Left/Right` | Navigate sections/columns |
| `Enter` | Select/confirm |
| `Space` | Toggle/drag |
| `Tab` | Switch focus |
| `ESC` | Back/cancel/exit |
