# Themes & Appearance

> Light, dark, auto, custom themes. Plus dynamic UI density, contextual suggestions, and animation tuning.
>
> *Audience: end user · Last reviewed: 2026-05-02*

TrueAI uses Tailwind CSS 4 + shadcn/ui v4 with CSS variables for
theming. You can switch theme on the fly, adjust density, dial back
animation, and let the UI adapt to your usage patterns.

---

## Theme switching

The **Theme Toggle** (sun/moon icon in the header) cycles through:

- Light
- Dark
- Auto (follows the OS / browser `prefers-color-scheme`)

For more control go to **Settings → Appearance → Theme Switcher** —
which exposes:

- All built-in themes
- Your saved custom themes
- Live preview while hovering

The active theme is persisted in KV (`active-theme`) and applied
synchronously on first paint to avoid a flash of the wrong theme.

<!-- SCREENSHOT: theme switcher with custom theme list -->

---

## Custom themes

A theme is a CSS variable bundle (background, foreground, accent,
border, radius, …). To add one:

1. Open **Settings → Appearance**.
2. Click **+ New theme**.
3. Tweak the swatches (use the colour picker, or paste a hex value).
4. Optionally pick a **typography preset** (system / serif / mono).
5. Save — your theme appears in the Theme Switcher.

Themes are persisted in KV under `custom-themes`. Export / import is
covered by [Settings → Data](Settings#data).

---

## Density

Comfortable / Compact. Compact tightens padding and reduces row
heights — useful on dense desktops, less useful on touch screens.

---

## Animation level

- **Full** — all framer-motion animations, including the
  `AnimatePresence mode="popLayout"` ones (e.g. recommendation list
  re-orderings).
- **Reduced** — short, subtle transitions only.
- **Off** — no animations.

The OS `prefers-reduced-motion` media query is respected by default
and overrides the in-app setting.

---

## Dynamic UI

`useDynamicUI` and `DynamicUICustomizer.tsx` let the app rearrange
itself based on **how you use it**:

- The most-used tabs surface first in the bottom nav
- Quick actions reorder by frequency
- Empty states change copy to point at the next likely action

The full dashboard is in `DynamicUIDashboard.tsx`. You can pin items
manually if you don't want the auto behaviour.

> Internals: `src/hooks/use-dynamic-ui.ts`. See
> [`DYNAMIC_UI_IMPLEMENTATION.md`](https://github.com/smackypants/TrueAI/blob/main/DYNAMIC_UI_IMPLEMENTATION.md).

---

## Contextual suggestions

`ContextualSuggestionsPanel.tsx` (powered by `use-contextual-ui`)
surfaces tips like:

- "You've sent 5 messages with the default model — try changing it
  per-conversation"
- "This agent has a 30% failure rate — open the Optimizer"
- "Your IndexedDB cache is over 200 MB — purge old conversations"

Suggestions can be dismissed individually or muted entirely in
Settings.

---

## Smart layout & dynamic background

`DynamicBackground` and the broader smart-layout components
(`src/components/ui/smart-layout`) tweak background colour stops and
spacing based on the active tab and time of day. Cosmetic only;
fully disabled when animation level is **Off**.

---

## See also

- [Settings](Settings) → Appearance / Theme Switcher
- Canonical: [`THEME_CUSTOMIZATION.md`](https://github.com/smackypants/TrueAI/blob/main/THEME_CUSTOMIZATION.md), [`THEME_TOGGLE.md`](https://github.com/smackypants/TrueAI/blob/main/THEME_TOGGLE.md), [`UI_IMPROVEMENTS.md`](https://github.com/smackypants/TrueAI/blob/main/UI_IMPROVEMENTS.md), [`DYNAMIC_UI_IMPLEMENTATION.md`](https://github.com/smackypants/TrueAI/blob/main/DYNAMIC_UI_IMPLEMENTATION.md)
