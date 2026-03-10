---
name: canvas-document
description: |
  Document canvas for displaying and editing markdown content.
  Use when showing documents, emails, proposals, or blog posts — or when users need to
  review content and select text for editing, revision, or feedback.
---

# Document Canvas

Display markdown documents with optional text selection and diff highlighting.

## Example Prompts

- "Draft an email to the marketing team about the Q1 product launch"
- "Help me edit this blog post — show it so I can highlight the parts to revise"
- "Write a project proposal and let me review it"
- "Show me the README so I can select sections to update"
- "Compose a response to this customer complaint"

## Scenarios

### `display` (default)
Read-only document view with markdown rendering. User can scroll but cannot select text.

```
canvas_spawn(
  kind: "document",
  scenario: "display",
  config: '{"content": "# Hello World\n\nThis is **markdown** content.", "title": "My Document"}'
)
```

### `edit`
Interactive document view with text selection. User can click and drag to select text,
which is retrieved via `canvas_selection` in real-time.

- Renders markdown with syntax highlighting (headers, bold, italic, code, links, lists, blockquotes)
- Diff highlighting: green background for additions, red for deletions
- Click and drag to select text
- Selection retrieved via `canvas_selection`

```
canvas_spawn(
  kind: "document",
  scenario: "edit",
  id: "document-1",
  config: '{"content": "# My Blog Post\n\nThis is the **introduction** to my post.\n\n## Section One\n\n- Point one\n- Point two", "title": "Blog Post Draft", "diffs": [{"startOffset": 50, "endOffset": 62, "type": "add"}]}'
)
```

Then retrieve selection:
```
canvas_selection(id: "document-1")
```

Or retrieve full content:
```
canvas_content(id: "document-1")
```

### `email-preview`
Specialized view for email content display.

```
canvas_spawn(
  kind: "document",
  scenario: "email-preview",
  config: '{"content": "Dear Team,\n\nPlease review the attached document.\n\nBest regards,\nAlice", "title": "RE: Project Update"}'
)
```

## Configuration

```typescript
interface DocumentConfig {
  content: string;        // Markdown content
  title?: string;         // Document title (shown in header)
  diffs?: DocumentDiff[]; // Optional diff markers for highlighting
  readOnly?: boolean;     // Disable selection (default: false for edit)
}

interface DocumentDiff {
  startOffset: number;    // Character offset in content
  endOffset: number;
  type: "add" | "delete";
}
```

## Markdown Rendering

Supported markdown features:
- **Headers** (`# H1`, `## H2`, etc.)
- **Bold** (`**text**`)
- **Italic** (`*text*`)
- **Code** (`` `inline` `` and fenced blocks)
- **Links** (`[text](url)`)
- **Lists** (`-` or `*` bullets)
- **Blockquotes** (`>`)

## Selection Result

Retrieved via `canvas_selection(id: "<canvas-id>")`:

```typescript
interface DocumentSelection {
  selectedText: string;   // The selected text
  startOffset: number;    // Start character offset
  endOffset: number;      // End character offset
  startLine: number;      // Line number (1-based)
  endLine: number;
  startColumn: number;    // Column in start line
  endColumn: number;
}
```

## Controls

- **Mouse click and drag**: Select text (edit scenario)
- `Up/Down` or scroll: Navigate document
- `q` or `Esc`: Close/cancel

## Typical Workflow

1. Generate markdown content (draft, proposal, email, etc.)
2. Spawn document in `edit` scenario with the content
3. User reviews and selects text to revise
4. Call `canvas_selection` to get selected passage
5. Revise the selected section and push update via `canvas_update`
6. Repeat until user is satisfied
