# Advanced Theme Customization System

## Overview

The theme customization system provides a comprehensive interface for creating, managing, and applying custom color schemes with live preview capabilities. Users can start from preset themes or create entirely custom palettes with real-time visual feedback.

## Key Features

### 1. **Live Preview Mode**
- **Instant Updates**: Color changes apply immediately to the entire interface without page reload
- **Preview Banner**: Clear visual indicator when in preview mode with option to exit
- **Safe Exploration**: Preview mode doesn't persist changes, allowing risk-free experimentation
- **One-Click Activation**: Convert previewed themes to active themes with single click

### 2. **Default Theme Library**
Six professionally designed preset themes:
- **Deep Ocean**: Cool blues and teals for a calm, professional feel (Current default)
- **Forest Night**: Green-tinted dark theme with natural aesthetics
- **Sunset Glow**: Warm oranges and reds for vibrant energy
- **Purple Dream**: Rich purples with high contrast
- **Cyberpunk**: Neon pinks and cyans with sharp edges
- **Minimal Light**: Clean, high-contrast light theme

### 3. **Custom Theme Creation**
- **Naming**: Give themes descriptive, memorable names
- **Base Templates**: Start from existing themes as templates
- **From Scratch**: Build completely custom themes
- **Organized Editor**: Colors grouped by category (Background, Actions, System)

### 4. **Advanced Color Picker**
- **OKLCH Color Space**: Perceptually uniform color adjustments for consistent visual results
- **16 Configurable Colors**:
  - Background colors: background, foreground, card, card-foreground, popover, popover-foreground
  - Action colors: primary, primary-foreground, secondary, secondary-foreground, accent, accent-foreground, muted, muted-foreground
  - System colors: destructive, destructive-foreground, border, input, ring
- **Border Radius**: Customize UI roundness
- **Color Presets**: Quick-access to common color values
- **Visual Swatches**: See colors at a glance in theme cards

### 5. **Theme Management**
- **Activation**: Set any theme as active with one click
- **Editing**: Modify custom themes after creation
- **Deletion**: Remove unwanted custom themes (defaults protected)
- **Persistence**: All custom themes saved to browser storage
- **Active Theme Indicator**: Visual badge shows currently active theme

### 6. **Export & Import**
- **JSON Export**: Download themes as portable JSON files
- **Import**: Load themes from JSON files
- **CSS Code Copy**: Copy theme CSS variables for external use
- **Sharing**: Share themes with other users via files

### 7. **Live Theme Preview Component**
Built-in preview showing:
- Primary, secondary, outline, and destructive buttons
- Card components with proper text contrast
- Icon with background gradient
- Typography samples
- Real-time updates as colors change

## Technical Implementation

### Color Format
Uses OKLCH (Oklab Lightness Chroma Hue) color space:
- **Lightness**: 0 (black) to 1 (white)
- **Chroma**: 0 (grayscale) to ~0.4 (vivid)
- **Hue**: 0-360 degrees
- Format: `oklch(L C H)` e.g., `oklch(0.45 0.15 260)`

### Storage
- Custom themes: `custom-themes` key in KV store
- Active theme ID: `active-theme-id` key in KV store
- Data persists across sessions
- Themes include metadata (id, name, createdAt)

### Architecture
```
ThemeSwitcher (Main Component)
├── ThemeCard (Theme Display & Actions)
│   └── ColorSwatch (Color Preview)
├── ThemeEditor (Color Customization)
│   └── ColorPicker (Individual Color Control)
└── CreateThemeDialog (New Theme Wizard)
```

## User Workflows

### Creating a Custom Theme
1. Click "Create Theme" button
2. Enter theme name
3. Optionally select base theme
4. Click "Create & Edit"
5. Adjust colors in categorized tabs
6. Watch live preview update
7. Click "Save Theme"

### Previewing Themes
1. Browse theme cards
2. Click "Preview" on any theme
3. See entire UI update with theme colors
4. Click "Exit Preview" to revert
5. Or click "Activate" to make permanent

### Editing Existing Themes
1. Click "Edit" on custom theme card
2. Modify colors in editor
3. See changes in real-time preview
4. Click "Save Theme" to persist changes

### Exporting Themes
1. Click "Export" on theme card
2. JSON file downloads automatically
3. Share file with others
4. Or click "Copy CSS" for code snippet

### Importing Themes
1. Click "Import" button
2. Select JSON theme file
3. Theme added to custom themes list
4. Ready to preview or activate

## Design Considerations

### Accessibility
- Color contrast ratios maintained for WCAG AA compliance
- Foreground/background pairings validated
- Text remains readable across all themes
- Focus indicators preserved

### Performance
- CSS variables update efficiently
- No page reloads required
- Smooth transitions between themes
- Minimal re-renders

### User Experience
- Clear visual feedback for all actions
- Preview mode prevents accidental changes
- Organized color categories reduce complexity
- Default themes provide inspiration
- Export/import enables theme sharing

## Future Enhancements

Potential additions:
- [ ] Color palette generator from images
- [ ] Gradient support for backgrounds
- [ ] Theme marketplace/community sharing
- [ ] Auto-contrast validator
- [ ] Dark/light mode toggle per theme
- [ ] Scheduled theme switching
- [ ] Per-component theme overrides
- [ ] Color blind accessibility modes
- [ ] Theme preview thumbnails
- [ ] Favorite themes collection

## Usage Tips

1. **Start Simple**: Use a preset theme as base for customization
2. **Test Contrast**: Ensure text is readable on all backgrounds
3. **Export Often**: Save themes before making major changes
4. **Use Preview**: Test themes before activating
5. **Organize by Purpose**: Name themes descriptively
6. **Share Creations**: Export and share favorite themes with team

## Integration

The theme switcher integrates with:
- Settings Menu → Appearance → Colors & Themes tab
- Global CSS variables in `index.css`
- useKV hook for persistence
- Framer Motion for smooth transitions
- Shadcn UI components throughout
