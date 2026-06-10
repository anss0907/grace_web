/**
 * GRACE Relay Server
 * 
 * A lightweight WebSocket relay that bridges the graceweb.tech website (Vercel)
 * with the local agent running on the Ubuntu laptop.
 * 
 * Roles:
 *   - "agent"     → the laptop (only 1 allowed)
 *   - "client"    → browser tabs (only 1 allowed for single-user mode)
 *   - "rosbridge" → browser rosbridge proxy (forwards to agent → local rosbridge)
 * 
 * Authentication: token-based via query params
 *   ws://relay?role=agent&token=AGENT_TOKEN
 *   ws://relay?role=client&token=CLIENT_TOKEN
 *   ws://relay?role=rosbridge&token=CLIENT_TOKEN
 */

const { WebSocketServer, WebSocket } = require("ws");
const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");

/* ── Load .env manually (no dotenv dependency) ────── */
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
const PORT = process.env.PORT || 8082;
const AGENT_TOKEN = process.env.AGENT_TOKEN;
const CLIENT_TOKEN = process.env.CLIENT_TOKEN;
const HEARTBEAT_INTERVAL = 30000; // 30s

if (!AGENT_TOKEN || !CLIENT_TOKEN) {
    console.error("AGENT_TOKEN and CLIENT_TOKEN environment variables are required.");
    process.exit(1);
}

/* ── State ────────────────────────────────────────── */
let agentSocket = null;
const clientSockets = new Set();
const rosbridgeSockets = new Set();

/* ── HTTP Server (for health checks) ──────────────── */
const server = http.createServer((req, res) => {
    if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: "ok",
            agentConnected: agentSocket !== null,
            clientConnected: clientSockets.size > 0,
            rosbridgeConnected: rosbridgeSockets.size > 0,
            uptime: process.uptime(),
        }));
        return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("GRACE Relay Server");
});

/* ── WebSocket Server ─────────────────────────────── */
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
    const params = new URL(req.url, `http://localhost`).searchParams;
    const role = params.get("role");
    const token = params.get("token");

    /* ── Authenticate ── */
    if (role === "agent") {
        if (token !== AGENT_TOKEN) {
            console.log("Agent connection rejected: invalid token");
            ws.close(4001, "Invalid agent token");
            return;
        }

        // Single agent: disconnect previous if exists
        if (agentSocket) {
            console.log("Previous agent disconnected (replaced by new connection)");
            agentSocket.close(4002, "Replaced by new agent");
        }

        agentSocket = ws;
        ws._role = "agent";
        console.log("Agent connected");

        // Notify client that agent is online
        sendToClient({ type: "agent_online" });

    } else if (role === "client") {
        if (token !== CLIENT_TOKEN) {
            console.log("Client connection rejected: invalid token");
            ws.close(4001, "Invalid client token");
            return;
        }

        clientSockets.add(ws);
        ws._role = "client";
        console.log(`Client connected (Total: ${clientSockets.size})`);

        // Inform client whether agent is online
        ws.send(JSON.stringify({
            type: agentSocket ? "agent_online" : "agent_offline",
        }));

    } else if (role === "rosbridge") {
        if (token !== CLIENT_TOKEN) {
            console.log("Rosbridge proxy rejected: invalid token");
            ws.close(4001, "Invalid client token");
            return;
        }

        rosbridgeSockets.add(ws);
        ws._role = "rosbridge";
        console.log(`Rosbridge proxy connected (Total: ${rosbridgeSockets.size})`);

        // Tell agent to connect to local rosbridge if this is the first one
        if (rosbridgeSockets.size === 1) {
            sendToAgent({ type: "rosbridge_connect" });
        }

    } else {
        console.log(`Unknown role: ${role}`);
        ws.close(4000, "Unknown role");
        return;
    }

    /* ── Heartbeat ── */
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });

    /* ── Message Routing ── */
    ws.on("message", (data) => {
        const raw = data.toString();

        if (ws._role === "client") {
            // Forward everything from client → agent
            if (agentSocket && agentSocket.readyState === WebSocket.OPEN) {
                agentSocket.send(raw);
            }
        } else if (ws._role === "rosbridge") {
            // Wrap rosbridge messages and forward to agent
            if (agentSocket && agentSocket.readyState === WebSocket.OPEN) {
                agentSocket.send(JSON.stringify({
                    type: "rosbridge_send",
                    data: raw,
                }));
            }
        } else if (ws._role === "agent") {
            // Parse to check if it's a rosbridge response
            try {
                const msg = JSON.parse(raw);
                if (msg.type === "rosbridge_recv") {
                    // Forward raw rosbridge data to rosbridge clients
                    for (const rb of rosbridgeSockets) {
                        if (rb.readyState === WebSocket.OPEN) {
                            rb.send(msg.data);
                        }
                    }
                    return; // Don't forward to regular client
                }
            } catch { /* not JSON, forward as-is */ }

            // Forward everything else from agent → clients
            for (const client of clientSockets) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(raw);
                }
            }
        }
    });

    /* ── Disconnect ── */
    ws.on("close", () => {
        if (ws._role === "agent" && ws === agentSocket) {
            agentSocket = null;
            console.log("Agent disconnected");
            sendToClient({ type: "agent_offline" });
        } else if (ws._role === "client") {
            clientSockets.delete(ws);
            console.log(`Client disconnected (Remaining: ${clientSockets.size})`);
        } else if (ws._role === "rosbridge") {
            rosbridgeSockets.delete(ws);
            console.log(`Rosbridge proxy disconnected (Remaining: ${rosbridgeSockets.size})`);
            if (rosbridgeSockets.size === 0) {
                sendToAgent({ type: "rosbridge_disconnect" });
            }
        }
    });

    ws.on("error", (err) => {
        console.error(`WebSocket error (${ws._role}):`, err.message);
    });
});

/* ── Heartbeat Timer ──────────────────────────────── */
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            console.log(`Dead connection detected (${ws._role}), terminating`);
            ws.terminate();
            return;
        }
        ws.isAlive = false;
        ws.ping();
    });
}, HEARTBEAT_INTERVAL);

wss.on("close", () => {
    clearInterval(heartbeatInterval);
});

/* ── Helpers ──────────────────────────────────────── */
function sendToClient(obj) {
    const payload = JSON.stringify(obj);
    for (const client of clientSockets) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
}

function sendToAgent(obj) {
    if (agentSocket && agentSocket.readyState === WebSocket.OPEN) {
        agentSocket.send(JSON.stringify(obj));
    }
}

/* ── Start ────────────────────────────────────────── */
server.listen(PORT, () => {
    console.log(`GRACE Relay Server listening on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
});
