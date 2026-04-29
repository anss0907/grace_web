/**
 * GRACE Local Agent
 * 
 * Runs on the Ubuntu 22.04 laptop (or Jetson Orin Nano).
 * Connects to the GRACE relay server via WebSocket and manages
 * pseudo-terminal (PTY) sessions that can be controlled from
 * the graceweb.tech website.
 * 
 * Requirements:
 *   - Node.js >= 18 (you have v20.20.0 ✅)
 *   - node-pty (compiled native addon)
 */

const WebSocket = require("ws");
const pty = require("node-pty");
const os = require("os");
const path = require("path");
const presets = require("./presets");

/* ── Load .env manually (no dotenv dependency) ────── */
const fs = require("fs");
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const idx = trimmed.indexOf("=");
        if (idx === -1) return;
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
    });
}

/* ── Config ───────────────────────────────────────── */
const RELAY_URL = process.env.RELAY_URL;
const AGENT_TOKEN = process.env.AGENT_TOKEN;

if (!RELAY_URL || !AGENT_TOKEN) {
    console.error("❌ RELAY_URL and AGENT_TOKEN are required.");
    console.error("   Set them in relay/agent/.env or as environment variables.");
    process.exit(1);
}

/* ── State ────────────────────────────────────────── */
const terminals = new Map(); // id → { pty, label, command, createdAt }
let ws = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;

/* ── Connect to Relay ─────────────────────────────── */
function connect() {
    const connectUrl = `${RELAY_URL}?role=agent&token=${AGENT_TOKEN}`;
    console.log(`🔌 Connecting to relay: ${RELAY_URL}`);

    ws = new WebSocket(connectUrl);

    ws.on("open", () => {
        console.log("✅ Connected to relay server");
        reconnectDelay = 1000; // Reset backoff

        // Send initial status
        sendAgentStatus();
    });

    ws.on("message", (data) => {
        try {
            const msg = JSON.parse(data.toString());
            handleMessage(msg);
        } catch (err) {
            console.error("⚠️  Invalid message:", err.message);
        }
    });

    ws.on("close", (code, reason) => {
        console.log(`🔴 Disconnected from relay (code: ${code}, reason: ${reason})`);
        ws = null;
        scheduleReconnect();
    });

    ws.on("error", (err) => {
        console.error("⚠️  WebSocket error:", err.message);
        // 'close' event will fire after this, triggering reconnect
    });

    ws.on("pong", () => {
        // Heartbeat response — relay is alive
    });
}

function scheduleReconnect() {
    console.log(`⏳ Reconnecting in ${reconnectDelay / 1000}s...`);
    setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
        connect();
    }, reconnectDelay);
}

/* ── Message Handler ──────────────────────────────── */
function handleMessage(msg) {
    switch (msg.type) {
        case "create_terminal":
            createTerminal(msg.id, msg.label || "Terminal");
            break;

        case "run_preset":
            runPreset(msg.id, msg.preset);
            break;

        case "send_input":
            sendInput(msg.id, msg.data);
            break;

        case "resize_terminal":
            resizeTerminal(msg.id, msg.cols, msg.rows);
            break;

        case "kill_terminal":
            killTerminal(msg.id);
            break;

        case "list_terminals":
            sendTerminalList();
            break;

        case "get_status":
            sendAgentStatus();
            break;

        case "get_presets":
            sendPresets();
            break;

        default:
            console.log(`❓ Unknown message type: ${msg.type}`);
    }
}

/* ── Terminal Management ──────────────────────────── */

function createTerminal(id, label) {
    if (terminals.has(id)) {
        console.log(`⚠️  Terminal ${id} already exists`);
        return;
    }

    const shell = process.env.SHELL || "/bin/bash";
    const ptyProcess = pty.spawn(shell, [], {
        name: "xterm-256color",
        cols: 120,
        rows: 30,
        cwd: os.homedir(),
        env: {
            ...process.env,
            TERM: "xterm-256color",
            COLORTERM: "truecolor",
        },
    });

    terminals.set(id, {
        pty: ptyProcess,
        label,
        command: null,
        createdAt: Date.now(),
    });

    // Stream output to client
    ptyProcess.onData((data) => {
        send({
            type: "terminal_output",
            id,
            data,
        });
    });

    // Handle exit
    ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`📦 Terminal "${label}" (${id}) exited (code: ${exitCode}, signal: ${signal})`);
        terminals.delete(id);
        send({
            type: "terminal_exited",
            id,
            exitCode,
            signal,
        });
    });

    console.log(`🖥️  Terminal created: "${label}" (${id})`);

    send({
        type: "terminal_created",
        id,
        label,
    });

    // Send updated list
    sendTerminalList();
}

function runPreset(id, presetName) {
    const preset = presets[presetName];
    if (!preset) {
        console.error(`❌ Unknown preset: ${presetName}`);
        send({
            type: "error",
            message: `Unknown preset: ${presetName}`,
        });
        return;
    }

    // Create terminal first
    createTerminal(id, preset.label);

    // Then send the command
    const term = terminals.get(id);
    if (term) {
        term.command = presetName;
        term.pty.write(preset.command + "\n");
        console.log(`▶️  Running preset "${presetName}" in terminal ${id}`);
    }
}

function sendInput(id, data) {
    const term = terminals.get(id);
    if (!term) {
        console.log(`⚠️  Terminal ${id} not found for input`);
        return;
    }
    term.pty.write(data);
}

function resizeTerminal(id, cols, rows) {
    const term = terminals.get(id);
    if (!term) return;
    try {
        term.pty.resize(cols, rows);
    } catch (err) {
        console.error(`⚠️  Resize error for ${id}:`, err.message);
    }
}

function killTerminal(id) {
    const term = terminals.get(id);
    if (!term) {
        console.log(`⚠️  Terminal ${id} not found for kill`);
        return;
    }
    console.log(`🔪 Killing terminal "${term.label}" (${id})`);
    term.pty.kill();
    terminals.delete(id);
    send({
        type: "terminal_exited",
        id,
        exitCode: null,
        signal: "SIGKILL",
    });
    sendTerminalList();
}

/* ── Status & Info ────────────────────────────────── */

function sendTerminalList() {
    const list = [];
    terminals.forEach((term, id) => {
        list.push({
            id,
            label: term.label,
            command: term.command,
            createdAt: term.createdAt,
        });
    });

    send({
        type: "terminal_list",
        terminals: list,
    });
}

function sendAgentStatus() {
    const nets = os.networkInterfaces();
    let ip = "unknown";
    for (const iface of Object.values(nets)) {
        for (const cfg of iface) {
            if (cfg.family === "IPv4" && !cfg.internal) {
                ip = cfg.address;
                break;
            }
        }
        if (ip !== "unknown") break;
    }

    send({
        type: "agent_status",
        hostname: os.hostname(),
        platform: os.platform(),
        uptime: os.uptime(),
        ip,
        nodeVersion: process.version,
        terminalCount: terminals.size,
    });
}

function sendPresets() {
    const list = {};
    for (const [key, preset] of Object.entries(presets)) {
        list[key] = {
            label: preset.label,
            description: preset.description,
        };
    }
    send({ type: "presets_list", presets: list });
}

/* ── Send Helper ──────────────────────────────────── */
function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(obj));
    }
}

/* ── Graceful Shutdown ────────────────────────────── */
function shutdown() {
    console.log("\n🛑 Shutting down agent...");

    // Kill all terminals
    terminals.forEach((term, id) => {
        try { term.pty.kill(); } catch { /* ignore */ }
    });
    terminals.clear();

    // Close WebSocket
    if (ws) {
        try { ws.close(); } catch { /* ignore */ }
    }

    process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/* ── Start ────────────────────────────────────────── */
console.log("╔══════════════════════════════════════╗");
console.log("║       GRACE Local Agent v1.0         ║");
console.log("╠══════════════════════════════════════╣");
console.log(`║  Host:   ${os.hostname().padEnd(27)}║`);
console.log(`║  Node:   ${process.version.padEnd(27)}║`);
console.log(`║  Relay:  ${RELAY_URL.slice(0, 27).padEnd(27)}║`);
console.log("╚══════════════════════════════════════╝");

connect();
