# Service Worker & Offline Support

This application implements a comprehensive service worker strategy for offline support and faster subsequent loads.

## Features

### 🚀 Performance Benefits
- **Cache-First Strategy** for static assets (HTML, CSS, JS)
- **Network-First Strategy** for dynamic content with fallback to cache
- **Automatic Asset Preloading** for critical resources
- **Smart Cache Management** with version control
- **Background Sync** for offline actions (future enhancement)

### 📦 What's Cached

1. **Static Assets Cache** (`trueai-static-v1.0.0`)
   - HTML files
   - CSS stylesheets
   - JavaScript bundles
   - Main application files

2. **Dynamic Content Cache** (`trueai-dynamic-v1.0.0`)
   - API responses
   - User-generated content
   - Runtime data

3. **Image Cache** (`trueai-images-v1.0.0`)
   - PNG, JPG, JPEG, SVG, GIF, WebP images
   - Icons and illustrations

4. **Font Cache** (`trueai-fonts-v1.0.0`)
   - Google Fonts
   - Custom font files

### 🔄 Cache Strategies

#### Cache-First (Static Assets)
```
Request → Cache → (if miss) Network → Update Cache
```
Best for: CSS, JS, images, fonts that don't change frequently

#### Network-First (Dynamic Content)
```
Request → Network → (if fail) Cache
```
Best for: API calls, user data, real-time content

### 📱 Offline Features

- **Offline Indicator**: Visual banner when connection is lost
- **Update Notifications**: Alerts when new version is available
- **Cache Manager**: View and clear cached data
- **Fallback Pages**: Graceful offline experience

### 🛠️ API Usage

#### Service Worker Registration
```typescript
import { register } from '@/lib/serviceWorker'

register({
  onSuccess: () => console.log('SW registered'),
  onUpdate: () => console.log('Update available'),
  onError: (error) => console.error('Registration failed', error)
})
```

#### Check Online Status
```typescript
import { isOffline, onOnlineStatusChange } from '@/lib/serviceWorker'

// Check current status
const offline = isOffline()

// Listen to changes
const cleanup = onOnlineStatusChange((isOnline) => {
  console.log('Online status:', isOnline)
})
```

#### Clear Cache
```typescript
import { clearCache } from '@/lib/serviceWorker'

await clearCache()
```

#### Get Cache Size
```typescript
import { getCacheSize } from '@/lib/serviceWorker'

const bytes = await getCacheSize()
console.log(`Cache size: ${bytes} bytes`)
```

#### Preload Assets
```typescript
import { preloadAssets } from '@/lib/serviceWorker'

await preloadAssets([
  '/images/hero.jpg',
  '/data/config.json',
  '/fonts/custom-font.woff2'
])
```

### 🎨 Components

#### OfflineIndicator
Shows connection status banner
```tsx
import { OfflineIndicator } from '@/components/notifications/OfflineIndicator'

<OfflineIndicator />
```

#### ServiceWorkerUpdate
Prompts user when update is available
```tsx
import { ServiceWorkerUpdate } from '@/components/notifications/ServiceWorkerUpdate'

<ServiceWorkerUpdate />
```

#### CacheManager
Manage cached data with UI
```tsx
import { CacheManager } from '@/components/notifications/CacheManager'

<CacheManager />
```

### 🔧 Configuration

#### Update Cache Version
Edit `/public/sw.js`:
```javascript
const CACHE_VERSION = 'v1.0.1' // Increment for new version
```

#### Add Assets to Static Cache
```javascript
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/custom-page.html' // Add new entries
]
```

#### Configure Update Check Interval
Default: 60 seconds. Edit `serviceWorker.ts`:
```typescript
function checkForUpdates(registration: ServiceWorkerRegistration) {
  setInterval(() => {
    registration.update()
  }, 60000) // Change to desired milliseconds
}
```

### 📊 Cache Management

The Cache Manager provides:
- Real-time cache size display
- Storage usage visualization
- One-click cache clearing
- Categorized content view

### 🎯 Best Practices

1. **Version Control**: Always increment `CACHE_VERSION` when deploying updates
2. **Cache Limits**: Monitor cache size to avoid exceeding browser limits (typically 50MB)
3. **Sensitive Data**: Never cache sensitive user data or authentication tokens
4. **Testing**: Test offline functionality in DevTools (Network → Offline)

### 🔍 Debugging

#### Chrome DevTools
1. Open DevTools (F12)
2. Go to Application tab
3. Service Workers section shows registration status
4. Cache Storage shows all cached resources

#### Clear Service Worker
```javascript
navigator.serviceWorker.getRegistrations().then((registrations) => {
  registrations.forEach(registration => registration.unregister())
})
```

### 🚨 Troubleshooting

**Service Worker not registering?**
- Check console for errors
- Ensure HTTPS or localhost
- Verify `/public/sw.js` exists
- Clear browser cache and hard refresh

**Updates not appearing?**
- Increment `CACHE_VERSION`
- Close all app tabs
- Clear old service workers in DevTools

**Cache growing too large?**
- Use Cache Manager to clear old data
- Implement cache expiration strategy
- Limit number of cached responses

### 📈 Future Enhancements

- Background sync for offline actions
- Periodic background sync
- Push notifications
- Advanced cache expiration policies
- Selective sync based on network conditions
- Offline analytics queuing

### 🔐 Security Considerations

- Service workers only work over HTTPS (except localhost)
- Cache API is origin-restricted
- No sensitive data in cache
- Regular cache cleanup recommended

### 📱 PWA Support

The app is PWA-ready with:
- Web App Manifest (`/public/manifest.json`)
- Installable on mobile and desktop
- Standalone display mode
- Custom app icons and theme colors
- App shortcuts for quick actions

### 📝 Notes

- Service worker updates automatically every 60 seconds
- Old caches are cleaned up on activation
- Network failures fall back to cached content
- Users are notified of updates with option to reload
