# 📸 VibeSnap - Desktop Snipping & Annotation Tool

**VibeSnap** is a modern, lightweight, high-performance desktop screenshot and annotation application designed for **Windows** and **macOS**. Inspired by Lightshot and the Windows 11 Snipping Tool, VibeSnap offers global hotkeys, instant screen selection cutouts, full annotation tools, delay timers, and quick copy/save workflows.

---

## ✨ Features

- ⚡ **Global Keyboard Trigger (`Ctrl + Shift + S`)**: Press anytime to freeze screen and trigger capture mode.
- 📐 **Interactive Region Selection**: Drag to create a selection box with 8 resize handles and real-time pixel dimension indicator ($W \times H$ px).
- 🎨 **Full Annotation Suite**:
  - **Freehand Pen**: Smooth line drawing.
  - **Arrow Pointer**: Highlight key elements.
  - **Rectangle Tool**: Draw bounding boxes.
  - **Text Tool**: Add inline notes directly on the image.
  - **Highlighter**: Semi-transparent marker tool.
  - **Blur / Redact Tool**: Pixelate passwords or sensitive data.
  - **Color Palette**: Choose vibrant custom stroke colors.
  - **Undo (`Ctrl + Z`)**: Revert edits step-by-step.
- 🖥️ **Windows Snipping Tool Dashboard**:
  - **New Snip Button** (`Ctrl + Shift + S`).
  - **Delay Timer Selector**: ⏱️ No delay, 3s, 5s, or 10s countdowns.
  - **Dynamic Resizable Preview Gallery**: Auto-displays recent captures with quick Copy/Save controls.
- ⚙️ **Settings & Preferences**: Toggle auto-copy to clipboard, desktop notifications, and default image export format (PNG/JPEG).
- 🍏 **Cross-Platform Ready**: Built on Electron & HTML5 Canvas for effortless deployment to Windows (`.exe`) and macOS (`.dmg`/`.app`).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation & Run

```bash
# Clone repository
git clone https://github.com/NDTindoy/screenshot-app.git
cd screenshot-app

# Install dependencies
npm install

# Start VibeSnap
npm start
```

### Build Executable Installers

```bash
# Build Windows Installer (.exe)
npm run build

# Build macOS Installer (.dmg)
npm run build:mac
```

---

## 📄 License
Licensed under the [MIT License](LICENSE).
