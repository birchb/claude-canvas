import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { realpathSync, writeFileSync, readFileSync } from "fs"
import { resolve } from "path"
import { execFileSync } from "child_process"

// ---------------------------------------------------------------------------
// Canvas types — mirrors canvas/src/canvases/registry.ts plus the 3 originals
// ---------------------------------------------------------------------------
const CANVAS_TYPES = [
  // Business (6)
  { id: "kanban",          name: "Kanban Board",       category: "business",     description: "Drag and drop task management board with columns and cards",       scenarios: ["project", "sprint", "personal"] },
  { id: "pipeline",        name: "Sales Pipeline",     category: "business",     description: "CRM-style deal pipeline with stages and probability tracking",     scenarios: ["sales", "leads", "opportunities"] },
  { id: "dashboard",       name: "Dashboard",          category: "business",     description: "Multi-widget dashboard with charts, stats, and KPIs",              scenarios: ["analytics", "metrics", "monitoring"] },
  { id: "invoice",         name: "Invoice",            category: "business",     description: "Invoice generator and viewer with line items and totals",           scenarios: ["create", "view", "edit"] },
  { id: "gantt",           name: "Gantt Chart",        category: "business",     description: "Project timeline visualization with tasks and milestones",          scenarios: ["project", "timeline", "planning"] },
  { id: "org-chart",       name: "Org Chart",          category: "business",     description: "Organization hierarchy visualization",                              scenarios: ["company", "team", "hierarchy"] },
  // Travel (2)
  { id: "hotel",           name: "Hotel Search",       category: "travel",       description: "Hotel comparison and booking interface",                            scenarios: ["search", "compare", "book"] },
  { id: "itinerary",       name: "Itinerary",          category: "travel",       description: "Trip planning with day-by-day activities",                          scenarios: ["plan", "view", "edit"] },
  // Personal (3)
  { id: "budget",          name: "Budget Tracker",     category: "personal",     description: "Personal/business budget tracking with categories",                 scenarios: ["monthly", "yearly", "project"] },
  { id: "smart-home",      name: "Smart Home",         category: "personal",     description: "IoT device dashboard and control panel",                            scenarios: ["control", "monitor", "automate"] },
  { id: "workout",         name: "Workout",            category: "personal",     description: "Exercise planning and tracking",                                    scenarios: ["plan", "active", "review"] },
  // Creative (1)
  { id: "playlist",        name: "Playlist",           category: "creative",     description: "Music playlist builder and player",                                 scenarios: ["build", "play", "edit"] },
  // Development (1)
  { id: "git-diff",        name: "Git Diff",           category: "development",  description: "Side-by-side diff viewer for git changes",                          scenarios: ["review", "stage", "commit"] },
  // AI (1)
  { id: "agent-dashboard", name: "Agent Dashboard",    category: "ai",           description: "Monitor and manage AI agents",                                      scenarios: ["monitor", "manage", "logs"] },
  // Original (3)
  { id: "calendar",        name: "Calendar",           category: "original",     description: "Calendar display and meeting picker",                               scenarios: ["display", "meeting-picker"] },
  { id: "document",        name: "Document",           category: "original",     description: "Markdown viewer and editor with IPC support",                       scenarios: ["view", "edit"] },
  { id: "flight",          name: "Flight",             category: "original",     description: "Flight search and booking interface",                               scenarios: ["search", "book"] },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the canvas directory relative to this file.
 * Uses realpathSync to follow symlinks (plugin is loaded via symlink from
 * ~/.config/opencode/plugins/canvas.ts -> repo/index.ts).
 */
function getCanvasDir(): string {
  const thisFile = realpathSync(import.meta.filename)
  return resolve(thisFile, "../canvas")
}

/**
 * Write config JSON to a temp file to avoid shell-escaping issues.
 * Uses fs.writeFileSync for compatibility across Bun/Node contexts.
 */
function writeConfigFile(id: string, config: string): string {
  const configFile = `/tmp/canvas-config-${id}.json`
  writeFileSync(configFile, config, "utf8")
  return configFile
}

/**
 * Ensure a tmux session exists. Called lazily at spawn time, not at plugin init,
 * so a missing tmux binary doesn't break plugin load.
 */
async function ensureTmux($: any): Promise<void> {
  if (process.env.TMUX) return  // already inside tmux

  const sessionName = "opencode-canvas"
  try {
    // Check if session exists; if not, create it detached
    await $`/opt/homebrew/bin/tmux has-session -t ${sessionName} 2>/dev/null || /opt/homebrew/bin/tmux new-session -d -s ${sessionName}`.quiet()
    console.log(`[canvas] tmux session '${sessionName}' ready`)
  } catch {
    // tmux may not be at Homebrew path — try bare command
    try {
      await $`tmux has-session -t ${sessionName} 2>/dev/null || tmux new-session -d -s ${sessionName}`.quiet()
    } catch (err: any) {
      throw new Error(`[canvas] tmux not found. Install with: brew install tmux\n${err?.message ?? ""}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

export const CanvasPlugin: Plugin = async ({ $ }) => {
  const canvasDir = getCanvasDir()

  return {
    tool: {

      // -----------------------------------------------------------------------
      // canvas_spawn — spawn a canvas in a tmux split pane
      // -----------------------------------------------------------------------
      canvas_spawn: tool({
        description: `Spawn an interactive TUI canvas in a tmux split pane.

Available canvas types: ${CANVAS_TYPES.map(c => c.id).join(", ")}

The canvas renders in a side-by-side tmux pane (2/3 width). If a canvas pane
already exists it is reused. Each canvas type accepts a JSON config object —
pass an empty object {} if you have no specific data yet.

Returns: spawn confirmation with the canvas ID.`,
        args: {
          kind: tool.schema
            .string()
            .describe(`Canvas type ID. One of: ${CANVAS_TYPES.map(c => c.id).join(", ")}`),
          config: tool.schema
            .string()
            .describe("Canvas configuration as a JSON string. Pass '{}' for defaults."),
          scenario: tool.schema
            .string()
            .optional()
            .describe("Scenario name to load (e.g. 'display', 'meeting-picker', 'project'). Optional."),
          id: tool.schema
            .string()
            .optional()
            .describe("Canvas instance ID. Defaults to '<kind>-1'. Use a custom ID to run multiple canvases."),
        },
        async execute(args) {
          const validIds = CANVAS_TYPES.map(c => c.id)
          if (!validIds.includes(args.kind)) {
            return `Error: unknown canvas type '${args.kind}'. Valid types: ${validIds.join(", ")}`
          }

          try {
            JSON.parse(args.config)
          } catch {
            return `Error: config is not valid JSON. Received: ${args.config}`
          }

          // Ensure tmux is available (lazy — only runs at spawn time)
          await ensureTmux($)

          const id = args.id ?? `${args.kind}-1`
          const configFile = writeConfigFile(id, args.config)
          const cliPath = `${canvasDir}/src/cli.ts`
          const scenarioArgs = args.scenario ? ["--scenario", args.scenario] : []

          // Pass TMUX env var explicitly so the CLI subprocess can detect the
          // tmux session even when OpenCode's shell doesn't inherit it.
          // Format: <socket_path>,<session_id>,<window_id>
          let tmuxEnv = process.env.TMUX ?? ""
          if (!tmuxEnv) {
            try {
              tmuxEnv = execFileSync("/opt/homebrew/bin/tmux", [
                "list-sessions", "-F", "#{socket_path},#{session_id},0"
              ], { encoding: "utf8" }).trim().split("\n")[0] ?? ""
            } catch {
              try {
                tmuxEnv = execFileSync("tmux", [
                  "list-sessions", "-F", "#{socket_path},#{session_id},0"
                ], { encoding: "utf8" }).trim().split("\n")[0] ?? ""
              } catch { /* tmux not found — will fail gracefully below */ }
            }
          }

          // Use execFileSync for spawn — avoids Bun $`...` subshell limitations
          // and gives us full stderr on failure.
          const configJson = readFileSync(configFile, "utf8")
          const spawnArgs = [
            "run", cliPath, "spawn", args.kind,
            "--id", id,
            "--config", configJson,
            ...scenarioArgs,
          ]

          try {
            const result = execFileSync("/opt/homebrew/bin/bun", spawnArgs, {
              encoding: "utf8",
              env: { ...process.env, TMUX: tmuxEnv },
            })
            return `Canvas '${id}' (${args.kind}) spawned successfully.\n${result.trim()}`
          } catch (err: any) {
            const stderr = err?.stderr ?? err?.message ?? String(err)
            return `Error spawning canvas '${args.kind}': ${stderr}`
          }
        },
      }),

      // -----------------------------------------------------------------------
      // canvas_update — send updated config to a running canvas via IPC
      // -----------------------------------------------------------------------
      canvas_update: tool({
        description: `Send updated configuration to a running canvas via Unix socket IPC.

Use this to push new data to a canvas that is already visible in the tmux pane,
without re-spawning it. The canvas re-renders with the new config instantly.

Returns: confirmation that the update was sent.`,
        args: {
          id: tool.schema
            .string()
            .describe("Canvas instance ID (must match the ID used when spawning, e.g. 'kanban-1')."),
          config: tool.schema
            .string()
            .describe("New canvas configuration as a JSON string."),
        },
        async execute(args) {
          try {
            JSON.parse(args.config)
          } catch {
            return `Error: config is not valid JSON. Received: ${args.config}`
          }

          const configFile = writeConfigFile(`${args.id}-update`, args.config)
          const cliPath = `${canvasDir}/src/cli.ts`

          try {
            const result = await $`bun run ${cliPath} update ${args.id} --config $(cat ${configFile})`.text()
            return `Canvas '${args.id}' updated successfully.\n${result.trim()}`
          } catch (err: any) {
            return `Error updating canvas '${args.id}': ${err?.message ?? String(err)}`
          }
        },
      }),

      // -----------------------------------------------------------------------
      // canvas_selection — get the current user selection from a canvas
      // -----------------------------------------------------------------------
      canvas_selection: tool({
        description: `Get the current user selection from a running canvas via IPC.

Useful for canvases where the user picks an item (e.g. calendar meeting-picker,
hotel comparison, flight search). Returns the selected data as JSON, or null if
no selection has been made yet.

Returns: JSON string of the selection data, or null.`,
        args: {
          id: tool.schema
            .string()
            .describe("Canvas instance ID (e.g. 'calendar-1')."),
        },
        async execute(args) {
          const cliPath = `${canvasDir}/src/cli.ts`
          try {
            const result = await $`bun run ${cliPath} selection ${args.id}`.text()
            const trimmed = result.trim()
            if (!trimmed || trimmed === "null") {
              return `No selection yet from canvas '${args.id}'.`
            }
            return `Selection from '${args.id}': ${trimmed}`
          } catch (err: any) {
            return `Error getting selection from canvas '${args.id}': ${err?.message ?? String(err)}`
          }
        },
      }),

      // -----------------------------------------------------------------------
      // canvas_content — get current content from a document canvas
      // -----------------------------------------------------------------------
      canvas_content: tool({
        description: `Get the current content from a running document canvas via IPC.

Use this specifically with the 'document' canvas type to retrieve the markdown
text the user has edited or is currently viewing.

Returns: JSON string of the document content, or null.`,
        args: {
          id: tool.schema
            .string()
            .describe("Canvas instance ID (e.g. 'document-1')."),
        },
        async execute(args) {
          const cliPath = `${canvasDir}/src/cli.ts`
          try {
            const result = await $`bun run ${cliPath} content ${args.id}`.text()
            const trimmed = result.trim()
            if (!trimmed || trimmed === "null") {
              return `No content yet from canvas '${args.id}'.`
            }
            return `Content from '${args.id}': ${trimmed}`
          } catch (err: any) {
            return `Error getting content from canvas '${args.id}': ${err?.message ?? String(err)}`
          }
        },
      }),

      // -----------------------------------------------------------------------
      // canvas_list — list all available canvas types
      // -----------------------------------------------------------------------
      canvas_list: tool({
        description: `List all available canvas types with their descriptions, categories, and supported scenarios.

Use this to discover what canvases are available before calling canvas_spawn.

Returns: formatted list of all 17 canvas types.`,
        args: {},
        async execute() {
          const byCategory = CANVAS_TYPES.reduce<Record<string, typeof CANVAS_TYPES>>((acc, c) => {
            if (!acc[c.category]) acc[c.category] = []
            ;(acc[c.category] as typeof CANVAS_TYPES).push(c)
            return acc
          }, {})

          const lines: string[] = ["Available Canvas Types", "=".repeat(40)]
          for (const [category, canvases] of Object.entries(byCategory)) {
            lines.push(`\n${category.toUpperCase()}`)
            for (const c of canvases) {
              lines.push(`  ${c.id.padEnd(18)} ${c.name}`)
              lines.push(`    ${c.description}`)
              lines.push(`    Scenarios: ${c.scenarios.join(", ")}`)
            }
          }
          lines.push(`\nTotal: ${CANVAS_TYPES.length} canvas types`)
          return lines.join("\n")
        },
      }),
    },
  }
}
