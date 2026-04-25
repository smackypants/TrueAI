export interface HardwareSpecs {
  deviceMemory?: number
  hardwareConcurrency: number
  maxTouchPoints: number
  platform: string
  userAgent: string
  screen: {
    width: number
    height: number
    pixelRatio: number
    colorDepth: number
  }
  gpu?: {
    vendor: string
    renderer: string
  }
  battery?: {
    level: number
    charging: boolean
  }
  connection?: {
    effectiveType: string
    downlink: number
    rtt: number
    saveData: boolean
  }
  performanceScore: number
  tier: 'low' | 'medium' | 'high' | 'ultra'
}

export interface OptimizedSettings {
  maxTokens: number
  streamingChunkSize: number
  enableAnimations: boolean
  enableBackgroundEffects: boolean
  conversationHistoryLimit: number
  maxConcurrentAgents: number
  cacheSize: number
  imageQuality: 'low' | 'medium' | 'high'
  tier: 'low' | 'medium' | 'high' | 'ultra'
  recommendations: string[]
}

export async function scanHardware(): Promise<HardwareSpecs> {
  const hardwareConcurrency = navigator.hardwareConcurrency || 4
  const deviceMemory = (navigator as any).deviceMemory || undefined
  const maxTouchPoints = navigator.maxTouchPoints || 0
  const platform = navigator.platform
  const userAgent = navigator.userAgent

  const screen = {
    width: window.screen.width,
    height: window.screen.height,
    pixelRatio: window.devicePixelRatio || 1,
    colorDepth: window.screen.colorDepth
  }

  let gpu: HardwareSpecs['gpu'] = undefined
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (gl) {
      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        gpu = {
          vendor: (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
          renderer: (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        }
      }
    }
  } catch (e) {
    console.warn('Could not detect GPU info')
  }

  let battery: HardwareSpecs['battery'] = undefined
  try {
    if ('getBattery' in navigator) {
      const batteryManager = await (navigator as any).getBattery()
      battery = {
        level: batteryManager.level,
        charging: batteryManager.charging
      }
    }
  } catch (e) {
    console.warn('Could not detect battery info')
  }

  let connection: HardwareSpecs['connection'] = undefined
  try {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (conn) {
      connection = {
        effectiveType: conn.effectiveType || 'unknown',
        downlink: conn.downlink || 0,
        rtt: conn.rtt || 0,
        saveData: conn.saveData || false
      }
    }
  } catch (e) {
    console.warn('Could not detect connection info')
  }

  const performanceScore = calculatePerformanceScore({
    hardwareConcurrency,
    deviceMemory,
    screen,
    gpu,
    connection
  })

  const tier = determineDeviceTier(performanceScore)

  return {
    deviceMemory,
    hardwareConcurrency,
    maxTouchPoints,
    platform,
    userAgent,
    screen,
    gpu,
    battery,
    connection,
    performanceScore,
    tier
  }
}

function calculatePerformanceScore(specs: {
  hardwareConcurrency: number
  deviceMemory?: number
  screen: HardwareSpecs['screen']
  gpu?: HardwareSpecs['gpu']
  connection?: HardwareSpecs['connection']
}): number {
  let score = 0

  score += Math.min(specs.hardwareConcurrency * 10, 100)

  if (specs.deviceMemory) {
    score += Math.min(specs.deviceMemory * 15, 120)
  } else {
    score += 50
  }

  const totalPixels = specs.screen.width * specs.screen.height * specs.screen.pixelRatio
  if (totalPixels > 4000000) {
    score += 80
  } else if (totalPixels > 2000000) {
    score += 60
  } else if (totalPixels > 1000000) {
    score += 40
  } else {
    score += 20
  }

  if (specs.gpu) {
    if (specs.gpu.renderer.toLowerCase().includes('nvidia') || 
        specs.gpu.renderer.toLowerCase().includes('adreno') ||
        specs.gpu.renderer.toLowerCase().includes('mali')) {
      score += 60
    } else {
      score += 30
    }
  } else {
    score += 20
  }

  if (specs.connection) {
    if (specs.connection.effectiveType === '4g') {
      score += 40
    } else if (specs.connection.effectiveType === '3g') {
      score += 20
    } else {
      score += 10
    }
  } else {
    score += 30
  }

  return Math.min(score, 500)
}

function determineDeviceTier(score: number): 'low' | 'medium' | 'high' | 'ultra' {
  if (score >= 350) return 'ultra'
  if (score >= 250) return 'high'
  if (score >= 150) return 'medium'
  return 'low'
}

export function generateOptimizedSettings(specs: HardwareSpecs): OptimizedSettings {
  const recommendations: string[] = []
  
  let settings: OptimizedSettings = {
    maxTokens: 2000,
    streamingChunkSize: 50,
    enableAnimations: true,
    enableBackgroundEffects: true,
    conversationHistoryLimit: 100,
    maxConcurrentAgents: 3,
    cacheSize: 50,
    imageQuality: 'high',
    tier: specs.tier,
    recommendations: []
  }

  switch (specs.tier) {
    case 'ultra':
      settings = {
        maxTokens: 4000,
        streamingChunkSize: 100,
        enableAnimations: true,
        enableBackgroundEffects: true,
        conversationHistoryLimit: 200,
        maxConcurrentAgents: 5,
        cacheSize: 100,
        imageQuality: 'high',
        tier: 'ultra',
        recommendations: []
      }
      recommendations.push('Your device can handle maximum performance settings')
      recommendations.push('All visual effects and animations enabled')
      recommendations.push('Increased conversation history and concurrent operations')
      break

    case 'high':
      settings = {
        maxTokens: 3000,
        streamingChunkSize: 75,
        enableAnimations: true,
        enableBackgroundEffects: true,
        conversationHistoryLimit: 150,
        maxConcurrentAgents: 4,
        cacheSize: 75,
        imageQuality: 'high',
        tier: 'high',
        recommendations: []
      }
      recommendations.push('Excellent performance - all features enabled')
      recommendations.push('Smooth animations and visual effects')
      break

    case 'medium':
      settings = {
        maxTokens: 2000,
        streamingChunkSize: 50,
        enableAnimations: true,
        enableBackgroundEffects: false,
        conversationHistoryLimit: 100,
        maxConcurrentAgents: 2,
        cacheSize: 50,
        imageQuality: 'medium',
        tier: 'medium',
        recommendations: []
      }
      recommendations.push('Balanced settings for optimal performance')
      recommendations.push('Some background effects disabled to improve responsiveness')
      recommendations.push('Consider limiting concurrent agent operations')
      break

    case 'low':
      settings = {
        maxTokens: 1000,
        streamingChunkSize: 25,
        enableAnimations: false,
        enableBackgroundEffects: false,
        conversationHistoryLimit: 50,
        maxConcurrentAgents: 1,
        cacheSize: 25,
        imageQuality: 'low',
        tier: 'low',
        recommendations: []
      }
      recommendations.push('Performance mode enabled for your device')
      recommendations.push('Animations disabled to reduce resource usage')
      recommendations.push('Limited concurrent operations for better stability')
      recommendations.push('Consider clearing conversation history regularly')
      break
  }

  if (specs.battery && specs.battery.level < 0.2 && !specs.battery.charging) {
    recommendations.push('⚠️ Low battery detected - consider reducing max tokens')
    settings.maxTokens = Math.floor(settings.maxTokens * 0.7)
    settings.enableAnimations = false
    settings.enableBackgroundEffects = false
  }

  if (specs.connection?.saveData) {
    recommendations.push('Data saver mode detected - optimizing for bandwidth')
    settings.maxTokens = Math.floor(settings.maxTokens * 0.8)
    settings.imageQuality = 'low'
  }

  if (specs.connection && (specs.connection.effectiveType === '2g' || specs.connection.effectiveType === 'slow-2g')) {
    recommendations.push('⚠️ Slow connection detected - reducing payload sizes')
    settings.maxTokens = Math.floor(settings.maxTokens * 0.6)
    settings.streamingChunkSize = Math.floor(settings.streamingChunkSize * 0.5)
  }

  if (specs.deviceMemory && specs.deviceMemory < 4) {
    recommendations.push('Limited memory detected - reducing cache size')
    settings.cacheSize = Math.floor(settings.cacheSize * 0.6)
    settings.conversationHistoryLimit = Math.floor(settings.conversationHistoryLimit * 0.7)
  }

  settings.recommendations = recommendations

  return settings
}

export function formatHardwareInfo(specs: HardwareSpecs): string {
  const lines: string[] = []
  
  lines.push(`**Device Tier**: ${specs.tier.toUpperCase()}`)
  lines.push(`**Performance Score**: ${specs.performanceScore}/500`)
  lines.push(`\n**Processor**`)
  lines.push(`- Cores: ${specs.hardwareConcurrency}`)
  if (specs.deviceMemory) {
    lines.push(`- Memory: ${specs.deviceMemory} GB`)
  }
  
  lines.push(`\n**Display**`)
  lines.push(`- Resolution: ${specs.screen.width}x${specs.screen.height}`)
  lines.push(`- Pixel Ratio: ${specs.screen.pixelRatio}x`)
  lines.push(`- Color Depth: ${specs.screen.colorDepth}-bit`)
  
  if (specs.gpu) {
    lines.push(`\n**Graphics**`)
    lines.push(`- Vendor: ${specs.gpu.vendor}`)
    lines.push(`- Renderer: ${specs.gpu.renderer}`)
  }
  
  if (specs.battery) {
    lines.push(`\n**Battery**`)
    lines.push(`- Level: ${Math.round(specs.battery.level * 100)}%`)
    lines.push(`- Status: ${specs.battery.charging ? 'Charging' : 'Not Charging'}`)
  }
  
  if (specs.connection) {
    lines.push(`\n**Network**`)
    lines.push(`- Type: ${specs.connection.effectiveType.toUpperCase()}`)
    lines.push(`- Downlink: ${specs.connection.downlink} Mbps`)
    lines.push(`- Latency: ${specs.connection.rtt}ms`)
    if (specs.connection.saveData) {
      lines.push(`- Data Saver: Enabled`)
    }
  }
  
  lines.push(`\n**Platform**: ${specs.platform}`)
  
  return lines.join('\n')
}
