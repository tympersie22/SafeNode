# SafeNode Desktop Icons

This directory should contain the following icon files for the desktop app:

## Required Icons:
- `icon.png` - 512x512px for system tray
- `32x32.png` - 32x32px for small icons
- `128x128.png` - 128x128px for medium icons
- `128x128@2x.png` - 256x256px for high-DPI displays
- `icon.icns` - macOS icon bundle
- `icon.ico` - Windows icon file

## Icon Design:
- **Lock symbol** with gradient background (purple to pink)
- **Consistent branding** with web app and browser extension
- **High quality** for all sizes and DPI settings

## Temporary Solution:
For now, you can copy the extension icons or create simple placeholders. The app will work without proper icons, but they should be added for production.

## Creating Icons:
1. **Design tool**: Create 512x512px master icon
2. **Generate sizes**: Use icon generator tools
3. **Platform formats**: Convert to .icns (macOS) and .ico (Windows)

The Tauri build process will automatically handle icon embedding.
