/**
 * GRACE Relay Server
 * 
 * A lightweight WebSocket relay that bridges the graceweb.tech website (Vercel)
 * with the local agent running on the Ubuntu laptop.
 * 
 * Roles:
 *   - "agent"  → the laptop (only 1 allowed)
 *   - "client" → browser tabs (only 1 allowed for single-user mode)
 * 
 * Authentication: token-based via query params
 *   ws://relay?role=agent&token=AGENT_TOKEN
 *   ws://relay?role=client&token=CLIENT_TOKEN
 */

const { WebSocketServer, WebSocket } = require("ws");
const http = require("http");
const url = require("url");

/* ── Config ───────────────────────────────────────── */
const PORT = process.env.PORT || 8080;
const AGENT_TOKEN = process.env.AGENT_TOKEN;
const CLIENT_TOKEN = process.env.CLIENT_TOKEN;
const HEARTBEAT_INTERVAL = 30000; // 30s

if (!AGENT_TOKEN || !CLIENT_TOKEN) {
    console.error("❌ AGENT_TOKEN and CLIENT_TOKEN environment variables are required.");
    process.exit(1);
}

/* ── State ────────────────────────────────────────── */
let agentSocket = null;
let clientSocket = null;

/* ── HTTP Server (for health checks) ──────────────── */
const server = http.createServer((req, res) => {
    if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: "ok",
            agentConnected: agentSocket !== null,
            clientConnected: clientSocket !== null,
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
            console.log("⛔ Agent connection rejected: invalid token");
            ws.close(4001, "Invalid agent token");
            return;
        }

        // Single agent: disconnect previous if exists
        if (agentSocket) {
            console.log("⚠️  Previous agent disconnected (replaced by new connection)");
            agentSocket.close(4002, "Replaced by new agent");
        }

        agentSocket = ws;
        ws._role = "agent";
        console.log("✅ Agent connected");

        // Notify client that agent is online
        sendToClient({ type: "agent_online" });

    } else if (role === "client") {
        if (token !== CLIENT_TOKEN) {
            console.log("⛔ Client connection rejected: invalid token");
            ws.close(4001, "Invalid client token");
            return;
        }

        // Single client mode: disconnect previous
        if (clientSocket) {
            console.log("⚠️  Previous client disconnected (replaced by new session)");
            clientSocket.close(4003, "Replaced by new client session");
        }

        clientSocket = ws;
        ws._role = "client";
        console.log("✅ Client connected");

        // Inform client whether agent is online
        sendToClient({
            type: agentSocket ? "agent_online" : "agent_offline",
        });

    } else {
        console.log(`⛔ Unknown role: ${role}`);
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
        } else if (ws._role === "agent") {
            // Forward everything from agent → client
            if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(raw);
            }
        }
    });

    /* ── Disconnect ── */
    ws.on("close", () => {
        if (ws._role === "agent" && ws === agentSocket) {
            agentSocket = null;
            console.log("🔴 Agent disconnected");
            sendToClient({ type: "agent_offline" });
        } else if (ws._role === "client" && ws === clientSocket) {
            clientSocket = null;
            console.log("🔴 Client disconnected");
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
            console.log(`💀 Dead connection detected (${ws._role}), terminating`);
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
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify(obj));
    }
}

/* ── Start ────────────────────────────────────────── */
server.listen(PORT, () => {
    console.log(`🚀 GRACE Relay Server listening on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
});
