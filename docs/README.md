# GRACE Robot Website

A production-quality web interface for **GRACE** — a female digital nurse robot running ROS 2 Humble on a Jetson Orin Nano Super (JetPack 6).

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Milestone 0 — Environment Setup (Laptop)](#milestone-0--environment-setup-laptop)
  - [Step 1: Install nvm (Node Version Manager)](#step-1-install-nvm-node-version-manager)
  - [Step 2: Install Node.js v20 LTS](#step-2-install-nodejs-v20-lts)
  - [Step 3: Scaffold the Next.js Project](#step-3-scaffold-the-nextjs-project)
  - [Step 4: Add COLCON_IGNORE](#step-4-add-colcon_ignore)
  - [Step 5: Verify the Dev Server](#step-5-verify-the-dev-server)
- [Milestone 0 — Environment Setup (Jetson)](#milestone-0--environment-setup-jetson)
  - [Step 1: Install rosbridge_suite](#step-1-install-rosbridge_suite)
  - [Step 2: Install foxglove_bridge](#step-2-install-foxglove_bridge)
  - [Step 3: Install Node.js v20 on Jetson (Optional)](#step-3-install-nodejs-v20-on-jetson-optional)
- [How It All Connects](#how-it-all-connects)
- [Versions & Compatibility](#versions--compatibility)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR LAPTOP                          │
│              (Ubuntu 22.04, i5 12th Gen)                │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │          Next.js Dev Server (:3000)              │   │
│   │   - Home page (3D model + docs)                  │   │
│   │   - Dashboard (topic viewer, joystick)           │   │
│   │   - Viz (Foxglove embed, map viewer)             │   │
│   └──────────────────┬──────────────────────────────┘   │
│                      │                                   │
│              Opens in your browser                       │
│              http://localhost:3000                        │
└──────────────────────┼──────────────────────────────────┘
                       │ WebSocket connections over WiFi/LAN
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                    JETSON ORIN NANO                       │
│           (JetPack 6, Ubuntu 22.04 ARM64)                │
│                                                          │
│   ┌────────────────────┐  ┌────────────────────────┐     │
│   │  rosbridge_suite   │  │   foxglove_bridge      │     │
│   │  (WebSocket :9090) │  │   (WebSocket :8765)    │     │
│   │                    │  │                        │     │
│   │  Used by roslibjs  │  │  Used by Foxglove      │     │
│   │  for: topic list,  │  │  Studio embed for:     │     │
│   │  joystick, mode    │  │  map, TF, laser scan,  │     │
│   │  switch, camera    │  │  robot model viewer    │     │
│   └────────┬───────────┘  └────────┬───────────────┘     │
│            │                       │                     │
│            └───────────┬───────────┘                     │
│                        ▼                                 │
│   ┌────────────────────────────────────────────────┐     │
│   │              ROS 2 Humble                       │     │
│   │  Nav2 · SLAM Toolbox · diff_drive_controller   │     │
│   │  twist_mux · IMU/EKF · Camera · LiDAR          │     │
│   └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Requirement | Laptop | Jetson |
|-------------|--------|--------|
| OS | Ubuntu 22.04 (x86_64) | JetPack 6 / Ubuntu 22.04 (ARM64) |
| ROS 2 | Not required | ROS 2 Humble (already installed) |
| Node.js | v20 LTS (we install this) | Only if hosting website from Jetson |
| Network | Same WiFi / LAN as Jetson | Same WiFi / LAN as laptop |
| Browser | Chrome, Firefox, or Edge | Not needed on Jetson |

---

## Milestone 0 — Environment Setup (Laptop)

### Step 1: Install nvm (Node Version Manager)

**What is nvm?** nvm lets you install and switch between multiple Node.js versions without breaking your system. It installs Node.js in your home directory (no `sudo` needed).

**Why nvm instead of `sudo apt install nodejs`?** Ubuntu 22.04's default Node.js is very old (v12). We need v20. nvm gives us exactly the version we want.

```bash
# Download and run the nvm installer script (v0.40.1)
# This adds nvm to your ~/.bashrc so it loads automatically in new terminals
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

**What this command does:**
1. Downloads the nvm install script from GitHub
2. Clones the nvm repository to `~/.nvm/`
3. Adds three lines to your `~/.bashrc` that load nvm when you open a terminal

**After running, either:**
- Close and reopen your terminal, OR
- Load nvm in your current terminal:

```bash
# Load nvm into the current shell session (only needed once, right now)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

**Verify nvm is working:**

```bash
nvm --version
# Expected output: 0.40.1
```

---

### Step 2: Install Node.js v20 LTS

**What is Node.js?** A JavaScript runtime that runs outside the browser. Next.js (our web framework) runs on Node.js.

**What is npm?** Node Package Manager — installs JavaScript libraries (like `pip` for Python or `apt` for Ubuntu).

```bash
# Install Node.js version 20 (LTS = Long Term Support = stable)
# This downloads the official binary for your CPU architecture (x86_64)
# and installs it in ~/.nvm/versions/node/v20.x.x/
nvm install 20
```

**What this command does:**
1. Downloads `node-v20.20.0-linux-x64.tar.xz` from nodejs.org
2. Verifies the checksum (integrity check)
3. Extracts it to `~/.nvm/versions/node/v20.20.0/`
4. Sets it as your default Node.js version

**Verify installation:**

```bash
# Check Node.js version
node --version
# Expected: v20.20.0

# Check npm version (installed automatically with Node.js)
npm --version
# Expected: 10.8.2

# Check npx (runs packages without global install, also comes with npm)
npx --version
# Expected: 10.8.2
```

---

### Step 3: Scaffold the Next.js Project

**What is Next.js?** A React-based web framework that handles routing, server-side rendering, bundling, and optimization. Think of it as "the professional way to build React websites."

**Why Next.js?** It gives us file-based routing (each page is a file), built-in TypeScript support, and an optimized production build we can later run on the Jetson.

```bash
# Navigate to your ROS workspace source directory
cd ~/grace_ws/src

# Create a new Next.js project called "grace_web"
# Breakdown of every flag:
#   npx -y              → Run the package without asking for confirmation
#   create-next-app@latest → Use the latest Next.js project scaffolder
#   ./grace_web          → Create the project in a folder called grace_web (inside current dir)
#   --typescript         → Use TypeScript instead of plain JavaScript (type safety!)
#   --app                → Use the App Router (modern Next.js routing, not the old Pages Router)
#   --no-tailwind        → Don't install TailwindCSS (we'll write custom CSS -- GRACE theme)
#   --eslint             → Include ESLint (catches code errors and bad patterns)
#   --no-src-dir         → Put app/ directly in the project root (simpler structure)
#   --import-alias "@/*" → Use @/ as shortcut for imports (e.g., @/components/Navbar)
#   --yes                → Accept defaults for any remaining prompts
#   --disable-git        → Don't initialize a git repo (we're inside the ROS workspace git)
npx -y create-next-app@latest ./grace_web \
  --typescript \
  --app \
  --no-tailwind \
  --eslint \
  --no-src-dir \
  --import-alias "@/*" \
  --yes \
  --disable-git
```

**What this command creates:**

```
grace_web/
├── app/                    ← Your website pages live here
│   ├── layout.tsx          ← Root layout (wraps every page: nav, footer, providers)
│   ├── page.tsx            ← Home page (http://localhost:3000/)
│   └── globals.css         ← Global CSS styles
├── public/                 ← Static files (images, fonts, 3D models)
├── node_modules/           ← Installed packages (auto-generated, don't edit)
├── package.json            ← Project config: name, scripts, dependencies
├── package-lock.json       ← Exact dependency versions (auto-generated)
├── tsconfig.json           ← TypeScript configuration
├── next.config.ts          ← Next.js build/runtime configuration
├── eslint.config.mjs       ← ESLint rules configuration
├── next-env.d.ts           ← TypeScript type declarations for Next.js
└── README.md               ← Auto-generated readme
```

**Key files explained:**

| File | What it does | You edit it? |
|------|-------------|-------------|
| `app/page.tsx` | The home page component | ✅ Yes — this becomes our 3D landing page |
| `app/layout.tsx` | Wraps every page (navbar, providers) | ✅ Yes — we add nav + ROS provider here |
| `app/globals.css` | Global styles for the whole site | ✅ Yes — our GRACE color theme goes here |
| `package.json` | Lists dependencies and scripts | ✅ Yes — we add new packages here |
| `next.config.ts` | Next.js settings | ✅ Yes — we configure for production later |
| `node_modules/` | Installed packages | ❌ Never — auto-managed by npm |
| `package-lock.json` | Locks exact versions | ❌ Never — auto-managed by npm |

---

### Step 4: Add COLCON_IGNORE

**What is COLCON_IGNORE?** When you run `colcon build` in your ROS workspace, colcon scans every folder inside `src/` looking for ROS packages (it looks for `package.xml`). If it finds a folder with a file called `COLCON_IGNORE` (empty file, no extension), it **completely skips** that folder.

**Why do we need it?** Our `grace_web` folder has its own `package.json` (Node.js) which is NOT a ROS package. Without `COLCON_IGNORE`, colcon would get confused or waste time scanning 40,000+ files in `node_modules/`.

```bash
# Create an empty COLCON_IGNORE marker file
touch ~/grace_ws/src/grace_web/COLCON_IGNORE
```

**Verify colcon ignores it:**

```bash
cd ~/grace_ws
colcon list
# grace_web should NOT appear in the list
# You should only see: grace_bringup, grace_controller, grace_description, etc.
```

---

### Step 5: Verify the Dev Server

**What does `npm run dev` do?** It starts the Next.js development server with hot-reloading. Any time you edit a file, the browser auto-refreshes. This is your development workflow.

```bash
# Navigate to the project
cd ~/grace_ws/src/grace_web

# Start the development server
npm run dev
```

**Expected output:**

```
▲ Next.js 16.1.6 (Turbopack)
- Local:         http://localhost:3000
- Network:       http://192.168.x.x:3000

✓ Ready in ~1500ms
```

**Now open your browser** and go to `http://localhost:3000`. You should see the default Next.js welcome page.

**To stop the server:** Press `Ctrl + C` in the terminal.

**Useful npm commands:**

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server (hot-reload, localhost:3000) |
| `npm run build` | Create optimized production build |
| `npm start` | Run the production build (after `npm run build`) |
| `npm run lint` | Check code for errors/style issues |
| `npm install <package>` | Add a new dependency |

---

## Milestone 0 — Environment Setup (Jetson)

> [!NOTE]
> These steps are for **later** when you're ready to connect the website to your robot. You don't need to do them now.

### Step 1: Install rosbridge_suite

**What is rosbridge_suite?** A ROS 2 package that creates a WebSocket server. Our website connects to this WebSocket to subscribe to topics, publish commands, and call services — all from JavaScript in the browser.

**Why WebSocket?** Browsers can't speak the ROS 2 DDS protocol directly. WebSocket is a standard web protocol that browsers support natively. rosbridge translates between WebSocket (JSON) and ROS 2 (DDS).

```bash
# On the Jetson, install rosbridge_suite from the ROS 2 Humble apt repos
sudo apt update
sudo apt install ros-humble-rosbridge-suite
```

**To launch it (when ready to use):**

```bash
# Start the WebSocket server on port 9090
# Any device on your LAN can connect to ws://jetson-ip:9090
ros2 launch rosbridge_server rosbridge_websocket_launch.xml port:=9090
```

**Reference:** [rosbridge_suite GitHub](https://github.com/RobotWebTools/rosbridge_suite)

### Step 2: Install foxglove_bridge

**What is foxglove_bridge?** Similar to rosbridge, but speaks the Foxglove WebSocket protocol. Foxglove Studio (a powerful robotics visualization tool) connects through this bridge to display maps, TF trees, laser scans, and 3D models.

**Why both bridges?** rosbridge (port 9090) is used by our custom JavaScript code (roslibjs). foxglove_bridge (port 8765) is used by the embedded Foxglove Studio iframe. They serve different purposes and don't conflict.

```bash
# On the Jetson, install foxglove_bridge
sudo apt install ros-humble-foxglove-bridge
```

**To launch it (when ready to use):**

```bash
# Start the Foxglove WebSocket server on port 8765
ros2 launch foxglove_bridge foxglove_bridge_launch.xml port:=8765
```

**References:**
- [Foxglove ROS 2 Getting Started](https://docs.foxglove.dev/docs/getting-started/ros2)
- [Foxglove Studio (web)](https://studio.foxglove.dev)
- [Foxglove SDK repo](https://github.com/foxglove/foxglove-sdk)

### Step 3: Install Node.js v20 on Jetson (Optional)

> [!NOTE]
> Only needed if you want the Jetson to serve the website directly (so any device on WiFi can access it without the laptop running). Not required for development.

```bash
# Same nvm installation process, but on the Jetson (ARM64 binary is auto-selected)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Close and reopen terminal, then:
nvm install 20

# Verify
node --version   # v20.20.0
npm --version    # 10.8.2
```

**This works on JetPack 6** because Node.js provides official `linux-arm64` binaries. nvm auto-detects your architecture and downloads the correct one.

---

## How It All Connects

When everything is running, here's the data flow:

```
┌──────── Your Browser (laptop) ─────────┐
│                                         │
│  Home Page     Dashboard      Viz       │
│  (3D model)   (topics,       (Foxglove  │
│               joystick,      map, TF,   │
│               camera)        scan)      │
│      │            │              │      │
│      │     roslibjs library      │      │
│      │       (JavaScript)    Foxglove   │
│      │            │          Studio     │
│      │            │          (iframe)   │
└──────┼────────────┼──────────────┼──────┘
       │            │              │
       │   ws://jetson:9090  ws://jetson:8765
       │            │              │
┌──────┼────────────┼──────────────┼──────┐
│      │     rosbridge_suite  foxglove_   │
│      │      (WebSocket)     bridge      │
│      │            │         (WebSocket) │
│      │            └──────┬──────┘       │
│      │                   ▼              │
│      │          ROS 2 Topic Network     │
│      │    /map /scan /tf /cmd_vel etc.  │
│      │                                  │
│              JETSON ORIN NANO           │
└─────────────────────────────────────────┘
```

---

## Versions & Compatibility

Everything we installed, with confirmation of compatibility:

| Component | Version | Laptop (x86_64) | Jetson (ARM64 JetPack 6) |
|-----------|---------|:---:|:---:|
| nvm | 0.40.1 | ✅ | ✅ |
| Node.js | 20.20.0 LTS | ✅ | ✅ (official ARM64 binary) |
| npm | 10.8.2 | ✅ | ✅ |
| Next.js | 16.1.6 | ✅ | ✅ (pure JavaScript) |
| ROS 2 Humble | Humble Hawksbill | N/A | ✅ (already installed) |
| rosbridge_suite | Humble apt package | N/A | ✅ (ARM64 available) |
| foxglove_bridge | Humble apt package | N/A | ✅ (ARM64 available) |
| Ubuntu | 22.04 | ✅ | ✅ (JetPack 6 base) |
