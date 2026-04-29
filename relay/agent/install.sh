#!/bin/bash
# ─────────────────────────────────────────────────────
# GRACE Agent — systemd Service Installer
#
# Installs the GRACE agent as a systemd service so it
# auto-starts on boot and auto-reconnects after reboots.
#
# Usage:
#   sudo bash install.sh
# ─────────────────────────────────────────────────────

set -e

AGENT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="grace-agent"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
NODE_BIN="$(which node)"
CURRENT_USER="${SUDO_USER:-$USER}"

echo "╔══════════════════════════════════════╗"
echo "║   GRACE Agent Service Installer      ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  Agent dir:  $AGENT_DIR"
echo "  Node:       $NODE_BIN"
echo "  User:       $CURRENT_USER"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run with sudo: sudo bash install.sh"
    exit 1
fi

# Check .env exists
if [ ! -f "$AGENT_DIR/.env" ]; then
    echo "❌ .env file not found in $AGENT_DIR"
    echo "   Copy .env.example to .env and fill in your tokens first."
    exit 1
fi

# Install npm dependencies if needed
if [ ! -d "$AGENT_DIR/node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    cd "$AGENT_DIR"
    sudo -u "$CURRENT_USER" npm install
fi

# Create systemd service
echo "📝 Creating systemd service: $SERVICE_FILE"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=GRACE Robot Local Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$AGENT_DIR
ExecStart=$NODE_BIN $AGENT_DIR/agent.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF

# Reload and enable
echo "🔄 Reloading systemd..."
systemctl daemon-reload

echo "✅ Enabling service..."
systemctl enable "$SERVICE_NAME"

echo "🚀 Starting service..."
systemctl start "$SERVICE_NAME"

echo ""
<<<<<<< HEAD
echo "╔══════════════════════════════════════╗"
echo "║         Installation Complete!       ║"
echo "╠══════════════════════════════════════╣"
echo "║  Service: $SERVICE_NAME              ║"
echo "║  Status:  systemctl status $SERVICE_NAME ║"
echo "║  Logs:    journalctl -u $SERVICE_NAME -f ║"
echo "║  Stop:    sudo systemctl stop $SERVICE_NAME ║"
echo "║  Remove:  sudo systemctl disable $SERVICE_NAME ║"
echo "╚══════════════════════════════════════╝"
=======
echo "╔══════════════════════════════════════════════════════╗"
echo "║            Installation Complete!                   ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Service: $SERVICE_NAME                             ║"
echo "║  Logs:    ~/grace_ws/src/grace_web/relay/agent/agent.log ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  MANAGE:                                            ║"
echo "║  Status:  sudo systemctl status $SERVICE_NAME       ║"
echo "║  Logs:    journalctl -u $SERVICE_NAME -f            ║"
echo "║  Restart: sudo systemctl restart $SERVICE_NAME      ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  STOP / UNDO:                                       ║"
echo "║                                                     ║"
echo "║  # Stop the agent RIGHT NOW                         ║"
echo "║  sudo systemctl stop $SERVICE_NAME                  ║"
echo "║                                                     ║"
echo "║  # Prevent auto-start on boot                       ║"
echo "║  sudo systemctl disable $SERVICE_NAME               ║"
echo "║                                                     ║"
echo "║  # FULL UNDO — remove service completely            ║"
echo "║  sudo rm /etc/systemd/system/$SERVICE_NAME.service  ║"
echo "║  sudo systemctl daemon-reload                       ║"
echo "╚══════════════════════════════════════════════════════╝"
>>>>>>> 5626d53 (feat(remote): implement secure websocket relay and xterm.js terminal control with command auditing)
