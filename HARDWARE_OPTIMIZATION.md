# Hardware Optimization Feature

## Overview
The TrueAI LocalAI platform now includes automatic hardware detection and optimization capabilities that adapt the application's performance settings to match your device's capabilities.

## How It Works

### Automatic Scanning
When you first launch the app (if auto-optimize is enabled), the system automatically scans your device to detect:

- **CPU**: Number of cores and processing power
- **Memory**: Available RAM (in GB)
- **GPU**: Graphics card vendor and renderer
- **Display**: Screen resolution, pixel ratio, and color depth
- **Battery**: Current level and charging status
- **Network**: Connection type (4G, 3G, etc.), speed, and latency

### Performance Scoring
Based on the detected hardware, the system calculates a performance score (0-500) and assigns your device to one of four tiers:

- **ULTRA** (350-500): High-end devices with maximum capabilities
- **HIGH** (250-349): Premium devices with excellent performance
- **MEDIUM** (150-249): Standard devices with balanced performance
- **LOW** (0-149): Entry-level devices optimized for efficiency

### Optimized Settings
The system automatically adjusts these settings based on your device tier:

#### Ultra Tier
- Max Tokens: 4000
- Streaming Chunk Size: 100
- Animations: Enabled
- Background Effects: Enabled
- Conversation History: 200 messages
- Concurrent Agents: 5
- Cache Size: 100 items
- Image Quality: High

#### High Tier
- Max Tokens: 3000
- Streaming Chunk Size: 75
- Animations: Enabled
- Background Effects: Enabled
- Conversation History: 150 messages
- Concurrent Agents: 4
- Cache Size: 75 items
- Image Quality: High

#### Medium Tier
- Max Tokens: 2000
- Streaming Chunk Size: 50
- Animations: Enabled
- Background Effects: Disabled
- Conversation History: 100 messages
- Concurrent Agents: 2
- Cache Size: 50 items
- Image Quality: Medium

#### Low Tier
- Max Tokens: 1000
- Streaming Chunk Size: 25
- Animations: Disabled
- Background Effects: Disabled
- Conversation History: 50 messages
- Concurrent Agents: 1
- Cache Size: 25 items
- Image Quality: Low

### Dynamic Adjustments
The system also makes real-time adjustments based on:

- **Low Battery**: Reduces max tokens by 30% and disables animations
- **Data Saver Mode**: Reduces max tokens by 20% and lowers image quality
- **Slow Connection**: Reduces payload sizes by 40-50%
- **Limited Memory**: Reduces cache size and conversation history by 30-40%

## Using the Hardware Optimizer

### Accessing the Feature
1. Navigate to the **Models** tab
2. Select the **Optimize** sub-tab (first option)
3. View your current hardware specs and optimized settings

### Manual Scanning
Click the **"Scan Device"** button to:
- Re-scan your hardware
- Update performance calculations
- Refresh optimization recommendations

### Auto-Optimize Toggle
Enable or disable automatic optimization on startup. When enabled, the app will scan your device each time you load the application.

### Viewing Details
Click **"Show Details"** to see comprehensive hardware information including:
- Exact CPU core count
- Memory capacity
- GPU details
- Display specifications
- Battery status
- Network metrics

### Applying Settings
Click **"Apply Settings"** to manually apply the optimized configuration to your current session.

## Benefits

### Performance
- Faster loading times on lower-end devices
- Smooth animations on capable hardware
- Optimized resource usage

### Battery Life
- Automatic power-saving adjustments
- Reduced processing for low battery situations

### Network Efficiency
- Smaller payloads on slow connections
- Data saver mode support

### User Experience
- Consistent performance across device tiers
- Transparent optimization process
- Customizable auto-optimization behavior

## Technical Details

### Browser API Support
The hardware scanner uses modern browser APIs:
- `navigator.hardwareConcurrency` - CPU cores
- `navigator.deviceMemory` - RAM detection
- `WebGL` debug extensions - GPU info
- `navigator.getBattery()` - Battery status
- `navigator.connection` - Network info

### Privacy
All hardware detection happens locally in your browser. No device information is transmitted to external servers.

### Compatibility
The feature gracefully degrades on browsers that don't support certain APIs, using sensible defaults when specific hardware information isn't available.
