# Dark/Light Theme Toggle Implementation

## Overview

A fully functional dark/light theme toggle has been added to TrueAI LocalAI with smooth transitions and system preference detection. Users can seamlessly switch between light mode, dark mode, and automatic system preference matching.

## Features

### 1. **Theme Toggle Button**
- **Location**: Header toolbar, right side next to settings
- **Icon Animation**: Smooth rotation and scale transitions between sun (light) and moon (dark) icons
- **Dropdown Menu**: Three options - Light, Dark, and System
- **Visual Feedback**: Active theme is indicated with a checkmark

### 2. **Three Theme Modes**
- **Light Mode**: High-contrast light color palette optimized for daylight viewing
- **Dark Mode**: Low-light optimized dark color palette (default)
- **System Mode**: Automatically matches the user's operating system preference

### 3. **Smooth Transitions**
All color changes include smooth 300ms transitions using cubic-bezier easing:
- Background colors
- Foreground (text) colors
- Border colors
- Card backgrounds
- All UI elements

### 4. **Persistent Preference**
- Theme selection is saved using `useKV` hook
- Preference persists across sessions
- No need to reconfigure on app restart

### 5. **Settings Integration**
- Theme mode selector also available in Settings → Appearance → Display Settings
- Large button cards for easy selection
- Synchronized with header toggle

## Color Palettes

### Dark Theme (Default)
```css
--background: oklch(0.18 0.01 260);      /* Deep blue-gray */
--foreground: oklch(0.98 0.005 200);     /* Near white */
--primary: oklch(0.50 0.18 260);         /* Vibrant blue */
--accent: oklch(0.75 0.16 200);          /* Cyan accent */
--card: oklch(0.22 0.015 260);           /* Slightly lighter than background */
--border: oklch(0.30 0.015 260);         /* Subtle borders */
```

### Light Theme
```css
--background: oklch(0.98 0.005 200);     /* Near white */
--foreground: oklch(0.15 0.01 260);      /* Dark blue-gray */
--primary: oklch(0.50 0.18 260);         /* Vibrant blue (same) */
--accent: oklch(0.65 0.16 200);          /* Slightly darker cyan */
--card: oklch(0.96 0.005 200);           /* Subtle card background */
--border: oklch(0.85 0.01 260);          /* Visible borders */
```

## Technical Implementation

### Files Created/Modified

1. **`src/hooks/use-theme.ts`** (NEW)
   - Custom React hook for theme management
   - Handles system preference detection
   - Manages CSS class application to `<html>` element
   - Returns current theme, setter, and resolved theme

2. **`src/components/ui/theme-toggle.tsx`** (NEW)
   - Dropdown menu component with three theme options
   - Animated icon transitions using Framer Motion
   - Visual indicators for active theme

3. **`src/index.css`** (UPDATED)
   - Added `.light` and `.dark` class definitions
   - Defined light mode color palette
   - Enhanced transition timing for smooth theme switches
   - Added `color-scheme` meta property for better browser integration

4. **`src/App.tsx`** (UPDATED)
   - Imported and added `ThemeToggle` to header toolbar
   - Positioned between IndexedDB status and customization buttons

5. **`src/components/settings/AppearanceSettings.tsx`** (UPDATED)
   - Integrated `useTheme` hook
   - Synchronized theme buttons with global theme state

## Usage

### Quick Toggle
Click the sun/moon icon in the header toolbar to open the theme menu and select your preference.

### Settings Panel
1. Click the gear icon in header
2. Navigate to "Appearance" tab
3. Select "Display Settings" sub-tab
4. Choose your preferred theme mode

### Programmatic Access
```typescript
import { useTheme } from '@/hooks/use-theme'

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  
  // Get current theme setting ('light' | 'dark' | 'system')
  console.log(theme)
  
  // Get actual applied theme ('light' | 'dark')
  console.log(resolvedTheme)
  
  // Change theme
  setTheme('light')
}
```

## Accessibility

- **Color Contrast**: Both themes meet WCAG AA standards for contrast ratios
- **Reduced Motion**: Respects `prefers-reduced-motion` media query
- **System Preferences**: Honors `prefers-color-scheme` in system mode
- **Keyboard Navigation**: Theme toggle fully accessible via keyboard
- **Screen Readers**: Proper ARIA labels on all interactive elements

## Performance

- **Zero Flickering**: Theme is applied before first paint
- **Efficient Updates**: CSS custom properties update instantly
- **Minimal Re-renders**: Theme changes don't trigger full app re-renders
- **Optimized Transitions**: Hardware-accelerated CSS transitions

## Mobile Optimization

- **Touch-Friendly**: Large tap targets (44px minimum)
- **Responsive**: Works seamlessly on all screen sizes
- **Battery Conscious**: Dark mode can save battery on OLED screens
- **Gesture Support**: No conflicts with swipe gestures

## Browser Compatibility

- ✅ Chrome/Edge 88+
- ✅ Firefox 87+
- ✅ Safari 14.1+
- ✅ Mobile browsers (iOS 14.5+, Android Chrome 88+)

Uses modern CSS features:
- CSS Custom Properties
- `oklch()` color space
- `prefers-color-scheme` media query
- `color-scheme` property

## Future Enhancements

Potential improvements:
- [ ] Time-based automatic theme switching
- [ ] Multiple custom theme presets
- [ ] Accent color customization
- [ ] High contrast mode
- [ ] Color blindness modes
- [ ] Theme preview before applying
- [ ] Per-component theme overrides
- [ ] Export/import theme configurations

## Tips

1. **System Mode**: Set to "System" to automatically match your OS preference
2. **Dark Mode Benefits**: Better for low-light environments and OLED battery life
3. **Light Mode Benefits**: Better for outdoor/bright environments and readability
4. **Customization**: Use the color theme customizer for fine-tuning after selecting base theme
5. **Keyboard Shortcut**: Consider adding Ctrl/Cmd+T for quick theme toggle in future

## Integration with Existing Features

The theme toggle works harmoniously with:
- ✅ Custom color theme system (ThemeSwitcher)
- ✅ Dynamic UI customization
- ✅ Performance optimizations
- ✅ Mobile-first design
- ✅ Offline functionality
- ✅ All tabs and components

## Testing

Tested scenarios:
- ✅ Theme persistence across page reloads
- ✅ System preference detection and changes
- ✅ Smooth transitions without flickering
- ✅ All components render correctly in both modes
- ✅ No contrast issues with custom colors
- ✅ Settings panel synchronization
- ✅ Mobile and desktop layouts
- ✅ Reduced motion preferences honored

## Troubleshooting

**Theme not applying?**
- Check browser console for errors
- Ensure localStorage/KV is available
- Clear cache and reload

**Transitions too slow/fast?**
- Modify transition duration in `index.css`
- Check for `prefers-reduced-motion` override

**Colors not matching?**
- Verify oklch() color format is supported
- Check custom theme overrides in ThemeSwitcher

**System mode not working?**
- Ensure browser supports `prefers-color-scheme`
- Check OS theme settings are configured
