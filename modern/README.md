# Modern X11 preview (experimental)

This is a **separate, modern Electron prototype** under `modern/` and does not replace the original XenonTrade files yet.

Supports Manjaro XFCE/X11, PoE 1 launched via Steam/Proton, item clipboard detection (after in-game Ctrl+C), supported unique items and currency previews using poe.ninja economy API. Supports manual paste test.

**Current limitations:** only selected item types, no rare-affix valuation, no full variant matching, no screenshot/keyboard injection, no system-tray restore after hiding (restart with `npm start`), no AppImage yet. Do NOT rely on displayed prices for trades without verifying exact item on official trade website.

Run on user's desktop:

```sh
sudo pacman -S --needed xdotool
cd ~/poe_overlay
git pull
cd modern
npm install
npm run check
npm start
```

**Do not run `npm install` at repository root:** original Electron 2 native dependencies are obsolete. The `modern` folder installs only Electron 45.

The renderer is sandboxed, context-isolated and uses a constrained preload bridge. External URLs are not opened. 15-minute API caching. The app only requests X11 foreground window title and reads the desktop clipboard to recognize PoE item copies; no global hotkey interception.

For a first test, keep the game in windowed-fullscreen mode and press Ctrl+C over a known unique item. For a manual test, paste its copied item text into the textbox and click Check.
