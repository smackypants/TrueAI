# PWA Icons

Place your app icons in this directory for PWA support.

## Required Icons

1. **icon-192.png** (192x192 pixels)
   - Used for Android home screen
   - App launcher icon
   
2. **icon-512.png** (512x512 pixels)
   - Used for splash screens
   - High-resolution displays

## Icon Guidelines

- Use PNG format with transparency
- Square aspect ratio
- Include padding for "maskable" icons (safe zone in center 80%)
- Use consistent branding and colors
- Test on different backgrounds

## Generating Icons

You can use online tools to generate PWA icons:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator
- https://favicon.io/

## Updating Icons

1. Replace `icon-192.png` and `icon-512.png` in `/public/`
2. Update `manifest.json` if changing sizes or adding new icons
3. Clear cache and test installation

## Current Setup

The manifest.json references:
- `/icon-192.png` - 192x192 (any maskable)
- `/icon-512.png` - 512x512 (any maskable)

Create these files with your app logo/branding for full PWA support.
