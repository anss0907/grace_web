# Web Development Guide: GRACE Project

This guide explains how your website project is structured, how to write code, and how to maintain the "GRACE Digital Nurse" aesthetic.

---

## 🏗️ Project Structure: What goes where?

Your project uses **Next.js 14 with the App Router**. Here are the most important files:

### 1. `app/layout.tsx` (The Wrapper)
- **Role**: This is the "frame" for your whole website.
- **What to do here**: Add things that should appear on *every* page, like the Navbar, Footer, and the ROS Connection Provider.
- **Analogy**: The chassis of the robot.

### 2. `app/page.tsx` (The Landing Page)
- **Role**: This is what the user sees first at `http://localhost:3000`.
- **What to do here**: This will contain the scroll-driven 3D model and the "Apple-style" product sections.
- **Analogy**: The face/exterior of the robot.

### 3. `app/globals.css` (The Styles)
- **Role**: Holds all your branding, colors, and global CSS rules.
- **What to do here**: Define the purplish-pink colors and font choices.
- **Analogy**: The paint job and aesthetic of the robot.

### 4. `app/dashboard/page.tsx` (The Control Room)
- **Role**: A separate page for live data and joystick controls.
- **What to do here**: This is where we build the "pro" interface for topic inspection and manual control.
- **Analogy**: The robot's diagnostic and control panel.

---

## 👩‍⚕️ GRACE Branding: Feminine Nurse Aesthetic

GRACE is a "Digital Nurse" robot. The colors and animations should feel **caring, professional, and soft**.

### The Color Palette
We use a **"Deep Midnight Lavender"** theme.

- **Primary**: `#9B59B6` (Amethyst Purple) - Trustworthy and medical.
- **Accent**: `#E91E63` (Rose Pink) - Compassionate and caring.
- **Background**: `#1A0A2E` (Very Dark Purple) - Modern and high-tech.
- **Text**: `#F3E5F5` (Lilac White) - Soft and easy on the eyes.
- **Highlight**: `#B76E79` (Rose Gold) - Premium and elegant.

### Animations
- **Style**: Avoid jittery or "cheap" transitions.
- **Feel**: Use **"Spring"** or **"Ease-out"** transitions (smooth acceleration and deceleration).
- **Goal**: Things should feel "fluid" and "weightless," like a calm interaction in a hospital.

---

## 🛠️ Development Workflow: How to build things

### 1. The "Dev Loop"
1. Open a terminal in `grace_web`.
2. Run `npm run dev`.
3. Open `http://localhost:3000` in Chrome.
4. **Edit code** in VS Code and **Save** (Ctrl+S).
5. Watch the browser **instantly update** (no need to manual refresh).

### 2. VS Code Recommended Extensions
Install these from the VS Code Marketplace for the best experience:

1. **ESLint**: Catches errors in your JavaScript/TypeScript code as you type.
2. **Prettier**: Automatically formats your code when you save (makes it "look pretty").
3. **ES7+ React/Redux/React-Native snippets**: Allows you to type `rfce` and hit Tab to create a new component instantly.
4. **Console Ninja**: Shows `console.log` output directly inside your text editor.
5. **Auto Close Tag**: Automatically adds the `</div>` when you type `<div>`.

---

## 🚀 Compiling & Running

### Development Mode (Fast)
Use this while building the site.
```bash
npm run dev
```

### Production Build (Optimized)
Use this when the site is finished and you want it to run as fast as possible (e.g., on the Jetson).
```bash
npm run build   # Compiles and optimizes everything
npm start       # Runs the optimized version
```

### Type Checking
Since we use **TypeScript**, we can check for logic errors without even running the code:
```bash
npx tsc --noEmit
```

---

## 💻 Where do I write code?

We will follow this pattern:
1. **Components**: Small pieces (Buttons, Charts, Joystick) go in a `components/` folder.
2. **Pages**: Big layouts go in the `app/` folder.
3. **Logic**: ROS communication logic goes in a `lib/` or `hooks/` folder.

**Ready to proceed?** Say "proceed" and we will start with **Milestone 1: The 3D Scroll Home Page**!
