---
name: canvas-calendar
description: |
  Calendar canvas for displaying events and picking meeting times.
  Use when showing calendar views, displaying scheduled events, or when users need to
  interactively select available time slots for meetings.
---

# Calendar Canvas

Display calendar views and enable interactive meeting time selection.

## Example Prompts

- "Schedule a 30-minute meeting with Alice and Bob sometime next week"
- "Find a time when the engineering team is all free on Tuesday"
- "Show me my calendar for this week"
- "When is everyone available for a 1-hour planning session?"
- "Block off 2-4pm on Friday for focused work"

## Scenarios

### `display` (default)
View-only calendar display. User can navigate weeks but cannot select times.

```
canvas_spawn(
  kind: "calendar",
  scenario: "display",
  config: '{"title": "My Week", "events": [{"id": "1", "title": "Meeting", "startTime": "2025-01-06T09:00:00", "endTime": "2025-01-06T10:00:00"}]}'
)
```

### `meeting-picker`
Interactive scenario for selecting a free time slot across multiple people's calendars.

- Shows multiple calendars overlaid with different colors
- User can **click** on free slots to select a meeting time
- Selection is retrieved via `canvas_selection`
- Supports configurable time slot granularity (15/30/60 min)

```
canvas_spawn(
  kind: "calendar",
  scenario: "meeting-picker",
  id: "calendar-1",
  config: '{"calendars": [{"name": "Alice", "color": "blue", "events": [{"id": "1", "title": "Standup", "startTime": "2025-01-06T09:00:00", "endTime": "2025-01-06T09:30:00"}]}, {"name": "Bob", "color": "green", "events": [{"id": "2", "title": "Call", "startTime": "2025-01-06T14:00:00", "endTime": "2025-01-06T15:00:00"}]}], "slotGranularity": 30, "minDuration": 30, "maxDuration": 120}'
)
```

Then retrieve the user's selection:
```
canvas_selection(id: "calendar-1")
```

## Configuration

### Display Config
```typescript
interface CalendarConfig {
  title?: string;
  events: CalendarEvent[];
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;  // ISO datetime
  endTime: string;    // ISO datetime
  color?: string;     // blue, green, red, yellow, magenta, cyan
}
```

### Meeting Picker Config
```typescript
interface MeetingPickerConfig {
  calendars: Calendar[];
  slotGranularity?: number;  // 15, 30, or 60 minutes (default: 30)
  minDuration?: number;      // Minimum meeting duration in minutes
  maxDuration?: number;      // Maximum meeting duration in minutes
}

interface Calendar {
  name: string;              // Person's name
  color: string;             // Calendar color
  events: CalendarEvent[];   // Their busy times
}
```

## Controls

**Display scenario:**
- `Left/Right` or `h/l`: Navigate between days
- `n` or `PageDown`: Next week
- `p` or `PageUp`: Previous week
- `t`: Jump to today
- `q` or `Esc`: Quit

**Meeting picker scenario:**
- **Mouse click**: Select a free time slot
- `Left/Right`: Navigate weeks
- `t`: Jump to today
- `q` or `Esc`: Cancel selection

## Selection Result

Retrieved via `canvas_selection(id: "<canvas-id>")`:

```typescript
interface MeetingSelection {
  startTime: string;  // ISO datetime
  endTime: string;    // ISO datetime
  duration: number;   // Minutes
}
```

## Typical Workflow

1. Gather each person's calendar events
2. Spawn calendar in `meeting-picker` scenario with all calendars
3. User clicks a free slot
4. Call `canvas_selection` to retrieve the chosen time
5. Confirm the meeting time back to the user
