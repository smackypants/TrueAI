# Mobile UI Enhancements for Android

This document outlines the mobile-first enhancements added to the TrueAI LocalAI platform for optimal Android mobile experiences.

## Overview

The application now features a comprehensive suite of mobile-optimized UI components and interactions designed specifically for touch-based Android interfaces.

## New Mobile Components

### 1. Mobile Bottom Navigation (`MobileBottomNav`)
**Location**: `src/components/ui/mobile-bottom-nav.tsx`

A fixed bottom navigation bar that provides easy thumb-reach access to primary app sections:
- **Features**:
  - Animated indicator that smoothly transitions between tabs
  - Large touch targets (64px minimum width)
  - Icon + label combo for clarity
  - Semi-transparent backdrop with blur effect
  - Safe area insets for edge-to-edge displays
  - Hidden on desktop (lg breakpoint and up)

- **Usage**: Automatically shown on mobile devices (< 768px width) with 4 main tabs: Chat, Agents, Models, and Analytics

### 2. Floating Action Button (`FloatingActionButton`)
**Location**: `src/components/ui/floating-action-button.tsx`

A context-aware FAB that appears in the bottom-right corner for primary actions:
- **Features**:
  - Spring-based animations for press feedback
  - Three size options: sm (48px), md (56px), lg (64px)
  - Positioned above bottom nav (bottom: 80px)
  - Gradient background matching app theme
  - Hidden on desktop
  
- **Context Awareness**:
  - Chat tab: Shows "New Conversation" action
  - Agents tab: Shows "Create Agent" action
  - Automatically hidden on tabs without primary actions

### 3. Swipeable Card (`SwipeableCard`)
**Location**: `src/components/ui/swipeable-card.tsx`

Enables swipe gestures on list items for quick actions:
- **Features**:
  - Drag-to-reveal actions on left/right swipes
  - Configurable action colors and icons
  - 100px swipe threshold for activation
  - Smooth physics-based animations
  - Optional disable prop for non-swipeable contexts

- **Common Use Cases**:
  - Swipe left to delete conversations
  - Swipe right to archive/favorite
  - Pull-to-refresh patterns

### 4. Touch Gesture Hooks (`use-touch-gestures`)
**Location**: `src/hooks/use-touch-gestures.ts`

Custom React hooks for advanced touch interactions:
- **`useSwipeGesture`**: Detects swipe direction (left/right/up/down) with customizable threshold
- **`useLongPress`**: Triggers actions on long-press (500ms default) for context menus

## Mobile-First Improvements

### Responsive Layout Changes
1. **Container Padding**: Reduced from `px-6` to `px-4` on mobile
2. **Bottom Spacing**: Added `pb-20` on mobile to account for bottom nav
3. **Hidden Desktop Elements**: Top tab list hidden on mobile (`hidden lg:grid`)
4. **Touch Target Sizing**: All interactive elements minimum 44×44px

### Touch Optimization
Added CSS optimizations in `index.css`:
```css
- Disabled tap highlight on HTML elements
- Custom tap highlight for buttons/links (subtle fade)
- Prevented text size adjustment in landscape
- Input font-size set to 16px (prevents zoom on focus)
- Safe area insets for notched displays
```

### Mobile-Specific Features
1. **Active Tab State Management**: Controlled via `activeTab` state for bottom nav
2. **Conditional FAB Display**: Context-aware based on current tab
3. **Responsive Dialog Sizes**: Full-screen on mobile, overlay on desktop
4. **Optimized Scroll Areas**: Touch-friendly scrolling with momentum

## Android-Specific Considerations

### Material Design Alignment
- **Elevation**: Bottom nav uses backdrop blur instead of heavy shadows
- **Ripple Effects**: Handled by framer-motion scale animations
- **FAB Positioning**: Standard 16px margin from edges
- **Navigation Bar**: Fixed bottom with proper z-indexing (z-50)

### Performance Optimizations
- **Lazy Motion**: Framer-motion animations optimized for 60fps
- **Layout Animations**: Uses `layoutId` for smooth shared element transitions
- **Touch Response**: < 100ms feedback on all interactions
- **Reduced Motion**: Respects user's motion preferences

### Accessibility
- **Touch Targets**: Minimum 48×48dp (Android standard)
- **Labels**: All nav items have visible labels, not icon-only
- **Focus Indicators**: Keyboard navigation still functional
- **Contrast**: WCAG AA compliant color pairings

## Implementation Details

### App.tsx Changes
1. Added `useIsMobile()` hook import and usage
2. Added `activeTab` state for mobile nav sync
3. Modified Tabs to be controlled component
4. Added conditional rendering for mobile components
5. Updated container padding to be responsive

### Breakpoint Strategy
- **Mobile**: < 768px (uses bottom nav + FAB)
- **Tablet**: 768px - 1024px (hybrid, shows both)
- **Desktop**: > 1024px (traditional top tabs)

### Z-Index Hierarchy
```
- Bottom Nav: z-50
- FAB: z-40
- Header: z-50
- Dialogs: z-50+
- Toasts: z-50+
```

## Usage Examples

### Adding a Swipeable List Item
```typescript
import { SwipeableCard } from '@/components/ui/swipeable-card'
import { Trash } from '@phosphor-icons/react'

<SwipeableCard
  onSwipeLeft={() => deleteItem(id)}
  leftAction={{
    icon: <Trash size={20} />,
    label: 'Delete',
    color: 'bg-destructive'
  }}
>
  <YourCardContent />
</SwipeableCard>
```

### Custom Touch Gesture
```typescript
import { useSwipeGesture } from '@/hooks/use-touch-gestures'

const swipeHandlers = useSwipeGesture({
  onSwipeLeft: () => navigate('forward'),
  onSwipeRight: () => navigate('back')
}, 75) // 75px threshold

<div {...swipeHandlers}>
  Swipeable content
</div>
```

### Long Press Action
```typescript
import { useLongPress } from '@/hooks/use-touch-gestures'

const { isPressed, handlers } = useLongPress(() => {
  showContextMenu()
}, 600)

<div {...handlers} className={isPressed ? 'opacity-50' : ''}>
  Long press me
</div>
```

## Future Enhancements

Potential mobile improvements for future iterations:
1. **Pull-to-refresh**: For conversation and agent lists
2. **Swipe navigation**: Between tabs using full-screen swipe
3. **Bottom sheets**: Alternative to dialogs on mobile
4. **Haptic feedback**: Vibration on key interactions
5. **Progressive Web App**: Add-to-homescreen capability
6. **Offline mode**: Service worker for offline access
7. **Gesture tutorials**: First-time user education overlays

## Testing Recommendations

1. **Device Testing**: Test on various screen sizes (320px - 768px)
2. **Touch Targets**: Verify all interactive elements are tappable
3. **Scroll Performance**: Check for jank in long lists
4. **Orientation Changes**: Test landscape mode behavior
5. **Safe Areas**: Verify on notched/dynamic island devices
6. **Slow Networks**: Test loading states on 3G simulation

## Notes

- All mobile components are hidden on desktop using Tailwind's `lg:hidden` utility
- Components use framer-motion for consistent animation timing
- Icons from @phosphor-icons/react are used throughout for visual consistency
- The mobile experience is opt-in based on screen size, not user-agent detection
