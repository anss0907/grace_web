/**
 * Relay server configuration
 * 
 * These are read from Vercel environment variables at build time.
 * Set them in Vercel dashboard → Settings → Environment Variables:
 *   NEXT_PUBLIC_RELAY_URL    = wss://your-project.up.railway.app
 *   NEXT_PUBLIC_CLIENT_TOKEN = your-client-token
 */

export const RELAY_URL = process.env.NEXT_PUBLIC_RELAY_URL || "";
export const CLIENT_TOKEN = process.env.NEXT_PUBLIC_CLIENT_TOKEN || "";

/**
 * Build the full relay WebSocket URL with auth params
 */
export function getRelayUrl(): string {
    // If we are browsing the site locally, bypass Ngrok and connect directly to the local relay
    if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("10.") || hostname.startsWith("192.168.");
        if (isLocal) {
            return `ws://${hostname}:8080?role=client&token=${CLIENT_TOKEN}`;
        }
    }

    if (!RELAY_URL) return "";
    
    // Ensure wss:// prefix for remote connections
    const base = RELAY_URL.startsWith("ws")
        ? RELAY_URL
        : `wss://${RELAY_URL}`;
    return `${base}?role=client&token=${CLIENT_TOKEN}`;
}
