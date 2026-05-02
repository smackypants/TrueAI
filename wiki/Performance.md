# Performance

> The runtime perf systems that keep TrueAI snappy: service worker, prefetching, lazy panels, virtual lists, hardware-driven tuning.
>
> *Audience: developer · Last reviewed: 2026-05-02*

Distinct from **model performance** (covered in
[Models](Models#benchmarks)), this page is about **app
performance** — frame budgets, bundle size, prefetch heuristics,
mobile snappiness.

---

## Subsystems

| System | Code | Purpose |
| --- | --- | --- |
| Service worker | `src/lib/serviceWorker.ts` | Cache shell, instant repeat loads |
| Lazy panels | `React.lazy` + `Suspense` in `App.tsx` | Code-split each tab |
| `LazyTabContent` | `src/components/LazyTabContent.tsx` | Lazy panel wrapper with skeleton + error boundary |
| `LazyErrorBoundary` | `src/components/LazyErrorBoundary.tsx` | Catch chunk load failures |
| Prefetch manager | `src/components/PrefetchManager.tsx` + `src/hooks/use-data-prefetcher.ts` | Idle prefetch of likely-next tab data |
| Tab preloader | `src/hooks/use-tab-preloader.ts` | Eager-load adjacent tab JS chunks |
| Virtual list | `src/components/VirtualList.tsx` | Render long lists efficiently |
| Animated card | `src/components/AnimatedCard.tsx` | framer-motion with reduced-motion guard |
| Hardware optimizer | `src/lib/hardware-scanner.ts` + `src/lib/performance-profiles.ts` | Tune the above based on device |
| `useAutoPerformanceOptimization` | `src/hooks/use-auto-performance.ts` | Apply hardware recommendations |
| Mobile debug logger | `src/lib/mobile-debug-logger.ts` | Capture runtime logs on Android |
| Scroll optimization | `src/lib/scroll-optimization.ts` | rAF-throttled scroll handlers |
| Performance scan | `src/lib/performance-scanner.ts` + `PerformanceScanPanel` | One-shot bottleneck audit |
| Performance monitor | `src/components/PerformanceMonitor.tsx` | Always-on FPS / long-task indicator |
| Performance indicator | `src/components/notifications/PerformanceIndicator.tsx` | "Slow operation detected" toast |

---

## Lazy loading

Every tab panel is `React.lazy`-loaded behind a `Suspense` boundary
with a friendly skeleton:

```tsx
const AgentCard = lazy(() => import('@/components/agent/AgentCard'))
```

`LazyErrorBoundary` wraps the `Suspense` so a chunk-load failure
(common on flaky mobile connections) renders a retry button instead
of crashing the tab.

---

## Prefetching

`PrefetchManager` uses idle callbacks to:

- Preload the JS chunk of the predicted next tab
- Pre-hydrate the data the next tab will need (e.g. agent list when
  the user is about to open the Agents tab)

Heuristics live in `use-data-prefetcher.ts` — frequency × recency ×
hover signals. Disabled on Save-Data / metered connections.

The `PrefetchStatusIndicator` and `PrefetchIndicator` surface what
got prefetched (mostly for debugging).

---

## Service worker strategy

- **App shell** (HTML, JS, CSS, fonts, icons) — cache-first.
- **`runtime.config.json`** — network-first with a stale fallback.
- **API responses** — never cached at the SW level; the offline
  queue handles those.

Update flow: see [Offline & Sync](Offline-and-Sync#service-worker).

---

## Hardware-driven tuning

The [Hardware Optimizer](Hardware-Optimizer) scan picks a
`PerformanceProfile`. Profiles tune:

| Knob | Conservative | Balanced | Aggressive |
| --- | --- | --- | --- |
| Streaming chunk size | small | medium | large |
| Prefetch radius | adjacent tab only | adjacent + 1 | all tabs |
| Animation level | reduced | full | full |
| IDB cache size cap | 50 MB | 200 MB | 1 GB |
| Concurrent agent runs | 1 | 2 | 4 |
| Image quality | low | medium | high |

`useAutoPerformanceOptimization` reapplies the profile on
significant environment changes (battery transition, network class
change, app resume).

---

## Mobile-specific work

- **Touch gestures** — `use-touch-gestures.ts` provides
  swipe-between-tabs.
- **Pull to refresh** — `use-pull-to-refresh.ts` + indicator
  component.
- **Bottom nav** — `MobileBottomNav.tsx`.
- **Floating action button** — `FloatingActionButton.tsx`.
- **Safe areas** — Tailwind classes wired to `env(safe-area-inset-*)`.
- **`MobileAgentList`** — vertical list optimized for thumbs.

See [`MOBILE_PERFORMANCE_OPTIMIZATION.md`](https://github.com/smackypants/TrueAI/blob/main/MOBILE_PERFORMANCE_OPTIMIZATION.md).

---

## Bundle hygiene

- Capacitor plugin imports are **dynamic** — they're never in the
  initial web bundle.
- Hosted-provider AI SDK packages are **dynamically imported** by
  the provider factory — local-only users don't download them.
- `knip` (`npm run check:deps`) checks for unused exports.
- ESLint v10 is in play with five noisy new rules demoted to `warn`
  while we work through ~91 pre-existing findings; see
  `eslint.config.js:58-69`.

---

## Performance scan + monitor

- **Performance Monitor** (`PerformanceMonitor.tsx`) — always-on,
  surfaces a small badge when frame rate drops or long tasks fire.
  Dev tool, hidden in production unless `__APP_DEBUG__` is true.
- **Performance Scan Panel** — point-in-time audit; see
  [Analytics → Performance Scan](Analytics).

---

## See also

- [Hardware Optimizer](Hardware-Optimizer)
- [Offline & Sync](Offline-and-Sync) — service worker details
- [Analytics](Analytics) — recommendations surface
- [Mobile & Android](Mobile-and-Android) — mobile UX systems
- Canonical: [`PERFORMANCE_OPTIMIZATIONS.md`](https://github.com/smackypants/TrueAI/blob/main/PERFORMANCE_OPTIMIZATIONS.md), [`UI_PERFORMANCE_GUIDE.md`](https://github.com/smackypants/TrueAI/blob/main/UI_PERFORMANCE_GUIDE.md), [`PREFETCHING.md`](https://github.com/smackypants/TrueAI/blob/main/PREFETCHING.md)
