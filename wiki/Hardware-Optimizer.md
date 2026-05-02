# Hardware Optimizer

> Detect what your device can do, then apply a performance profile that matches.
>
> *Audience: end user (with developer notes) · Last reviewed: 2026-05-02*

The **Hardware Optimizer** lives under **Models → Hardware
Optimizer**. It scans your device, picks an appropriate performance
profile, and (optionally) applies it to chat streaming, prefetching,
animation budget, and IndexedDB cache size.

UI: `src/components/models/HardwareOptimizer.tsx`. Scanner:
[`src/lib/hardware-scanner.ts`](https://github.com/smackypants/TrueAI/blob/main/src/lib/hardware-scanner.ts).
Profiles:
[`src/lib/performance-profiles.ts`](https://github.com/smackypants/TrueAI/blob/main/src/lib/performance-profiles.ts).
Auto-apply hook: `src/hooks/use-auto-performance.ts`.

---

## What gets scanned

| Reading | Source |
| --- | --- |
| CPU cores | `navigator.hardwareConcurrency` |
| Logical memory | `navigator.deviceMemory` (where exposed) |
| Pointer + touch | `navigator.maxTouchPoints` + media queries |
| Network class | `navigator.connection.effectiveType` (Save-Data flag too) |
| Battery state (mobile) | `navigator.getBattery()` |
| GPU class (best-effort) | `WebGLRenderingContext.getParameter(UNMASKED_RENDERER_WEBGL)` |
| Storage quota | `navigator.storage.estimate()` |
| Mobile native readings | Capacitor Device plugin where available |

The scan runs on first launch and on demand from the panel. Results
are cached in KV (`hardware-scan-result`).

<!-- SCREENSHOT: hardware optimizer panel showing detected hardware and recommendation -->

---

## Recommendation

The scanner maps readings to a `TaskType` (chat / agent / fine-tune /
benchmark) and recommends one of:

- **Conservative** — long battery life, smaller chunks, fewer
  prefetches, no parallel agent runs
- **Balanced** — sensible defaults
- **Aggressive** — assumes plenty of RAM and a fast network

The recommendation is *explainable*: the panel shows which readings
drove the recommendation (e.g. "device memory < 4 GB → conservative").

---

## Auto-apply

The **Apply** button writes the chosen profile to the
[Performance Profiles](Models#performance-profiles) store.
`useAutoPerformanceOptimization` can also apply automatically (you
opt-in in Settings → Advanced). Auto mode re-scans on each launch and
on big environment changes (battery transitions, network class
change).

---

## Mobile considerations

On Android the optimizer also factors in:

- Charging state (don't push aggressive on battery)
- Thermal pressure (where the OS reports it)
- Screen density (animation budget)

These come through the native layer (`src/lib/native/`) — see
[Native Layer](Native-Layer).

---

## See also

- [Models](Models) — Performance Profiles, Benchmarks
- [Performance](Performance) — runtime perf systems being tuned
- [System Requirements](System-Requirements)
- Canonical: [`HARDWARE_OPTIMIZATION.md`](https://github.com/smackypants/TrueAI/blob/main/HARDWARE_OPTIMIZATION.md), [`PERFORMANCE_OPTIMIZATIONS.md`](https://github.com/smackypants/TrueAI/blob/main/PERFORMANCE_OPTIMIZATIONS.md)
