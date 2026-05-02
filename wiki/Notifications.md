# Notifications

> Local, on-device notifications for agent completions, scheduled runs, and budget alerts. No push servers.
>
> *Audience: end user · Last reviewed: 2026-05-02*

TrueAI never sends push notifications from a server (it has no
server). All notifications are **local** — generated on your device
in response to something the app itself observed.

---

## Where notifications come from

| Trigger | Surface |
| --- | --- |
| Agent run completed | Toast + (Android) system notification |
| Scheduled agent run starting | Toast + (Android) system notification |
| Budget threshold crossed | Toast + (Android) system notification |
| Service-worker update available | In-app banner only |
| Sync queue flushed | Toast |
| Cache full / quota warnings | Toast |

---

## Components

| Component | Role |
| --- | --- |
| `NotificationCenter.tsx` | In-app notification feed (history, mark read, clear) |
| `OfflineIndicator.tsx` | Online/offline pill in the header |
| `OfflineQueueIndicator.tsx` | Queue-size badge |
| `OfflineQueuePanel.tsx` | Full queue view |
| `ServiceWorkerUpdate.tsx` | "New version available" banner |
| `InstallPrompt.tsx` | "Install as app" prompt |
| `CacheManager.tsx` | Cache size warnings + manual purge |
| `PerformanceIndicator.tsx` | "Slow operation detected" toast |

---

## Permission flow

On the web, TrueAI uses the standard `Notification` API; the user
must grant permission once. On Android (API 33+), the OS requires
explicit notification permission — `installer.ts` requests it on
first run via `@capacitor/local-notifications`.

If the user denies, in-app toasts still work; only the system
notifications are suppressed.

---

## Settings

[`NotificationSettings.tsx`](https://github.com/smackypants/TrueAI/blob/main/src/components/settings/NotificationSettings.tsx)
exposes:

- System permission status (re-request button)
- Per-trigger toggles (agent completion, scheduled runs, budget
  alerts, SW updates, cache warnings)
- Quiet hours (suppress all but critical alerts)

---

## See also

- [Agents](Agents) — scheduled-run notifications
- [Cost Tracking](Cost-Tracking) — budget alerts
- [Offline & Sync](Offline-and-Sync) — queue-related toasts
- [Mobile & Android](Mobile-and-Android) — Android permission specifics
- [Privacy](Privacy) — what notification data is recorded (only locally)
