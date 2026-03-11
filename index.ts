import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { realpathSync, writeFileSync, readFileSync, unlinkSync, existsSync } from "fs"
import { resolve } from "path"
import { execFileSync } from "child_process"
import { createServer, type Socket, type Server } from "net"

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

// Canvases that use client-mode IPC (connect to controller's server)
const CLIENT_MODE_CANVASE = ["calendar", "flight"]

// ---------------------------------------------------------------------------
// IPC Controller Server
// ---------------------------------------------------------------------------

interface CanvasState {
  selection: unknown | null
  cancelled: boolean
  error: string | null
  ready: boolean
  scenario: string | null
}

const canvasStates = new Map<string, CanvasState>()
const ipcServers = new Map<string, Server>()

function getSocketPath(id: string): string {
  return `/tmp/canvas-${id}.sock`
}

function initCanvasState(id: string): CanvasState {
  const state: CanvasState = {
    selection: null,
    cancelled: false,
    error: null,
    ready: false,
    scenario: null,
  }
  canvasStates.set(id, state)
  return state
}

function startIPCControllerServer(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socketPath = getSocketPath(id)
    const state = initCanvasState(id)

    // Remove existing socket file if present
    if (existsSync(socketPath)) {
      try { unlinkSync(socketPath) } catch {}
    }

    const server = createServer((socket: Socket) => {
      let buffer = ""

      socket.on("data", (data) => {
        buffer += data.toString()
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const msg = JSON.parse(line)
            handleMessage(id, msg, socket)
          } catch (e) {
            console.error(`[canvas] Failed to parse IPC message: ${line}`)
          }
        }
      })

      socket.on("error", (err) => {
        console.error(`[canvas] Socket error for ${id}:`, err.message)
      })
    })

    server.listen(socketPath, () => {
      ipcServers.set(id, server)
      console.log(`[canvas] IPC controller server started on ${socketPath}`)
      resolve()
    })

    server.on("error", (err) => {
      console.error(`[canvas] IPC server error for ${id}:`, err.message)
      reject(err)
    })
  })
}

function handleMessage(id: string, msg: any, socket: Socket) {
  const state = canvasStates.get(id)
  if (!state) return

  switch (msg.type) {
    case "ready":
      state.ready = true
      state.scenario = msg.scenario || null
      console.log(`[canvas] ${id} ready (scenario: ${state.scenario})`)
      break

    case "selected":
      state.selection = msg.data
      console.log(`[canvas] ${id} selection received:`, JSON.stringify(msg.data).slice(0, 100))
      break

    case "cancelled":
      state.cancelled = true
      console.log(`[canvas] ${id} cancelled: ${msg.reason || "no reason"}`)
      break

    case "error":
      state.error = msg.message
      console.error(`[canvas] ${id} error: ${msg.message}`)
      break

    case "pong":
      // Health check response - ignore
      break

    default:
      console.log(`[canvas] ${id} unknown message type: ${msg.type}`)
  }
}

function stopIPCControllerServer(id: string) {
  const server = ipcServers.get(id)
  if (server) {
    server.close()
    ipcServers.delete(id)
  }
  const socketPath = getSocketPath(id)
  if (existsSync(socketPath)) {
    try { unlinkSync(socketPath) } catch {}
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCanvasDir(): string {
  const thisFile = realpathSync(import.meta.filename)
  return resolve(thisFile, "../canvas")
}

function writeConfigFile(id: string, config: string): string {
  const configFile = `/tmp/canvas-config-${id}.json`
  writeFileSync(configFile, config, "utf8")
  return configFile
}

async function ensureTmux($: any): Promise<void> {
  if (process.env.TMUX) return

  const sessionName = "opencode-canvas"
  try {
    await $`/opt/homebrew/bin/tmux has-session -t ${sessionName} 2>/dev/null || /opt/homebrew/bin/tmux new-session -d -s ${sessionName}`.quiet()
    await $`/opt/homebrew/bin/tmux set -g mouse on`.quiet()
    console.log(`[canvas] tmux session '${sessionName}' ready`)
  } catch {
    try {
      await $`tmux has-session -t ${sessionName} 2>/dev/null || tmux new-session -d -s ${sessionName}`.quiet()
      await $`tmux set -g mouse on`.quiet()
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

      canvas_spawn: tool({
        description: `Spawn an interactive TUI canvas in a tmux split pane.

Available canvas types: ${CANVAS_TYPES.map(c => c.id).join(", ")}

The canvas renders in a side-by-side tmux pane (2/3 width). If a canvas pane
already exists it is reused. Each canvas type accepts a JSON config object —
pass an empty object {} if you have no specific data yet.

Returns: spawn confirmation with the canvas ID.`,
        args: {
          kind: tool.schema.string().describe(`Canvas type ID. One of: ${CANVAS_TYPES.map(c => c.id).join(", ")}`),
          config: tool.schema.string().describe("Canvas configuration as a JSON string. Pass '{}' for defaults."),
          scenario: tool.schema.string().optional().describe("Scenario name to load (e.g. 'display', 'meeting-picker'). Optional."),
          id: tool.schema.string().optional().describe("Canvas instance ID. Defaults to '<kind>-1'."),
        },
        async execute(args) {
          const validIds = CANVAS_TYPES.map(c => c.id)
          if (!validIds.includes(args.kind)) {
            return `Error: unknown canvas type '${args.kind}'. Valid types: ${validIds.join(", ")}`
          }

          try { JSON.parse(args.config) } catch {
            return `Error: config is not valid JSON. Received: ${args.config}`
          }

          await ensureTmux($)

          const id = args.id ?? `${args.kind}-1`
          const scenario = args.scenario || "display"
          const cliPath = `${canvasDir}/src/cli.ts`

          // For client-mode canvases (calendar, flight), start IPC server first
          const isClientMode = CLIENT_MODE_CANVASE.includes(args.kind) && 
                               (scenario === "meeting-picker" || scenario === "booking")
          
          if (isClientMode) {
            try {
              await startIPCControllerServer(id)
            } catch (err: any) {
              return `Error starting IPC server for ${id}: ${err.message}`
            }
          }

          // Get TMUX env
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
              } catch {}
            }
          }

          const configJson = readFileSync(writeConfigFile(id, args.config), "utf8")
          const socketPath = getSocketPath(id)
          
          const spawnArgs = [
            "run", cliPath, "spawn", args.kind,
            "--id", id,
            "--config", configJson,
            "--scenario", scenario,
          ]

          // Pass socket path for client-mode canvases
          if (isClientMode) {
            spawnArgs.push("--socket", socketPath)
          }

          try {
            const result = execFileSync("/opt/homebrew/bin/bun", spawnArgs, {
              encoding: "utf8",
              env: { ...process.env, TMUX: tmuxEnv },
            })
            return `Canvas '${id}' (${args.kind}/${scenario}) spawned successfully.\n${result.trim()}`
          } catch (err: any) {
            if (isClientMode) stopIPCControllerServer(id)
            const stderr = err?.stderr ?? err?.message ?? String(err)
            return `Error spawning canvas '${args.kind}': ${stderr}`
          }
        },
      }),

      canvas_update: tool({
        description: `Send updated configuration to a running canvas via Unix socket IPC.

Use this to push new data to a canvas that is already visible in the tmux pane,
without re-spawning it. The canvas re-renders with the new config instantly.

Returns: confirmation that the update was sent.`,
        args: {
          id: tool.schema.string().describe("Canvas instance ID (e.g. 'kanban-1')."),
          config: tool.schema.string().describe("New canvas configuration as a JSON string."),
        },
        async execute(args) {
          try { JSON.parse(args.config) } catch {
            return `Error: config is not valid JSON. Received: ${args.config}`
          }

          const cliPath = `${canvasDir}/src/cli.ts`
          const configJson = readFileSync(writeConfigFile(`${args.id}-update`, args.config), "utf8")

          try {
            const result = execFileSync("/opt/homebrew/bin/bun", [
              "run", cliPath, "update", args.id, "--config", configJson
            ], { encoding: "utf8" })
            return `Canvas '${args.id}' updated successfully.\n${result.trim()}`
          } catch (err: any) {
            return `Error updating canvas '${args.id}': ${err?.stderr ?? err?.message ?? String(err)}`
          }
        },
      }),

      canvas_selection: tool({
        description: `Get the current user selection from a running canvas via IPC.

Useful for canvases where the user picks an item (e.g. calendar meeting-picker,
flight booking). Returns the selected data as JSON, or null if no selection yet.

Returns: JSON string of the selection data, or null.`,
        args: {
          id: tool.schema.string().describe("Canvas instance ID (e.g. 'calendar-1')."),
        },
        async execute(args) {
          // Check if we have a stored selection from IPC server
          const state = canvasStates.get(args.id)
          if (state) {
            if (state.error) {
              return `Canvas '${args.id}' reported error: ${state.error}`
            }
            if (state.cancelled) {
              return `Canvas '${args.id}' was cancelled by user.`
            }
            if (state.selection !== null) {
              return `Selection from '${args.id}': ${JSON.stringify(state.selection)}`
            }
            if (!state.ready) {
              return `Canvas '${args.id}' not ready yet.`
            }
            return `No selection yet from canvas '${args.id}'. Waiting for user input...`
          }

          // Fallback: try CLI for server-mode canvases (document)
          const cliPath = `${canvasDir}/src/cli.ts`
          try {
            const result = execFileSync("/opt/homebrew/bin/bun", [
              "run", cliPath, "selection", args.id
            ], { encoding: "utf8", timeout: 3000 })
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

      canvas_content: tool({
        description: `Get the current content from a running document canvas via IPC.

Use this specifically with the 'document' canvas type to retrieve the markdown
text the user has edited or is currently viewing.

Returns: JSON string of the document content, or null.`,
        args: {
          id: tool.schema.string().describe("Canvas instance ID (e.g. 'document-1')."),
        },
        async execute(args) {
          const cliPath = `${canvasDir}/src/cli.ts`
          try {
            const result = execFileSync("/opt/homebrew/bin/bun", [
              "run", cliPath, "content", args.id
            ], { encoding: "utf8", timeout: 3000 })
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
