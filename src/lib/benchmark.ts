export interface BenchmarkMetrics {
  renderTime: number
  interactionLatency: number
  memoryUsage: number
  frameRate: number
  loadTime: number
  timestamp: number
}

export interface BenchmarkResult {
  id: string
  label: string
  metrics: BenchmarkMetrics
  settings: {
    maxTokens: number
    enableAnimations: boolean
    enableBackgroundEffects: boolean
    streamingChunkSize: number
  }
  score: number
}

export interface BenchmarkComparison {
  before: BenchmarkResult
  after: BenchmarkResult
  improvements: {
    renderTime: number
    interactionLatency: number
    memoryUsage: number
    frameRate: number
    loadTime: number
    overallScore: number
  }
}

export async function runBenchmark(settings: {
  maxTokens: number
  enableAnimations: boolean
  enableBackgroundEffects: boolean
  streamingChunkSize: number
}): Promise<BenchmarkResult> {
  const startTime = performance.now()
  const metrics: BenchmarkMetrics = {
    renderTime: 0,
    interactionLatency: 0,
    memoryUsage: 0,
    frameRate: 0,
    loadTime: 0,
    timestamp: Date.now()
  }

  await measureRenderPerformance(metrics, settings)
  await measureInteractionLatency(metrics)
  measureMemoryUsage(metrics)
  await measureFrameRate(metrics, settings)
  
  metrics.loadTime = performance.now() - startTime

  const score = calculateBenchmarkScore(metrics)

  return {
    id: `bench-${Date.now()}`,
    label: settings.enableAnimations ? 'Standard Settings' : 'Optimized Settings',
    metrics,
    settings,
    score
  }
}

async function measureRenderPerformance(
  metrics: BenchmarkMetrics,
  settings: { enableAnimations: boolean; enableBackgroundEffects: boolean }
): Promise<void> {
  const start = performance.now()
  
  const testElements: HTMLDivElement[] = []
  for (let i = 0; i < 50; i++) {
    const div = document.createElement('div')
    div.className = settings.enableAnimations ? 'animate-pulse' : ''
    div.style.cssText = `
      width: 100px;
      height: 100px;
      position: absolute;
      left: -9999px;
      ${settings.enableBackgroundEffects ? 'background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);' : 'background: #ccc;'}
    `
    document.body.appendChild(div)
    testElements.push(div)
  }

  await new Promise(resolve => requestAnimationFrame(resolve))
  
  testElements.forEach(el => document.body.removeChild(el))
  
  metrics.renderTime = performance.now() - start
}

async function measureInteractionLatency(metrics: BenchmarkMetrics): Promise<void> {
  const samples: number[] = []
  
  for (let i = 0; i < 10; i++) {
    const start = performance.now()
    
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        const button = document.createElement('button')
        button.style.position = 'absolute'
        button.style.left = '-9999px'
        document.body.appendChild(button)
        
        button.click()
        
        document.body.removeChild(button)
        resolve(null)
      })
    })
    
    samples.push(performance.now() - start)
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  
  metrics.interactionLatency = samples.reduce((a, b) => a + b, 0) / samples.length
}

function measureMemoryUsage(metrics: BenchmarkMetrics): void {
  if ('memory' in performance && (performance as { memory?: { usedJSHeapSize: number } }).memory) {
    const memory = (performance as { memory: { usedJSHeapSize: number } }).memory
    metrics.memoryUsage = Math.round(memory.usedJSHeapSize / 1048576)
  } else {
    metrics.memoryUsage = 0
  }
}

async function measureFrameRate(
  metrics: BenchmarkMetrics,
  settings: { enableAnimations: boolean }
): Promise<void> {
  const frames: number[] = []
  let lastTime = performance.now()
  
  const measureFrame = () => {
    const now = performance.now()
    const delta = now - lastTime
    if (delta > 0) {
      frames.push(1000 / delta)
    }
    lastTime = now
  }

  const animationDiv = document.createElement('div')
  animationDiv.style.cssText = `
    width: 50px;
    height: 50px;
    position: absolute;
    left: -9999px;
    ${settings.enableAnimations ? 'transition: transform 0.3s;' : ''}
  `
  document.body.appendChild(animationDiv)

  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        measureFrame()
        if (settings.enableAnimations) {
          animationDiv.style.transform = `translateX(${i * 10}px)`
        }
        resolve(null)
      })
    })
  }

  document.body.removeChild(animationDiv)

  if (frames.length > 0) {
    metrics.frameRate = Math.round(frames.reduce((a, b) => a + b, 0) / frames.length)
  } else {
    metrics.frameRate = 60
  }
}

function calculateBenchmarkScore(metrics: BenchmarkMetrics): number {
  let score = 100

  score -= Math.min(metrics.renderTime * 0.5, 30)
  score -= Math.min(metrics.interactionLatency * 2, 20)
  score -= Math.min((60 - metrics.frameRate) * 0.5, 15)
  score -= Math.min(metrics.loadTime * 0.1, 15)

  if (metrics.memoryUsage > 0) {
    score -= Math.min(metrics.memoryUsage * 0.05, 20)
  }

  return Math.max(Math.round(score), 0)
}

export function compareBenchmarks(before: BenchmarkResult, after: BenchmarkResult): BenchmarkComparison {
  const improvements = {
    renderTime: calculateImprovement(before.metrics.renderTime, after.metrics.renderTime),
    interactionLatency: calculateImprovement(before.metrics.interactionLatency, after.metrics.interactionLatency),
    memoryUsage: calculateImprovement(before.metrics.memoryUsage, after.metrics.memoryUsage),
    frameRate: calculateImprovement(after.metrics.frameRate, before.metrics.frameRate),
    loadTime: calculateImprovement(before.metrics.loadTime, after.metrics.loadTime),
    overallScore: calculateImprovement(after.score, before.score)
  }

  return {
    before,
    after,
    improvements
  }
}

function calculateImprovement(before: number, after: number): number {
  if (before === 0) return 0
  return Math.round(((before - after) / before) * 100)
}

export function formatMetric(value: number, unit: string): string {
  if (value === 0 && unit === 'MB') return 'N/A'
  return `${value.toFixed(1)}${unit}`
}

export function getImprovementColor(improvement: number): string {
  if (improvement > 10) return 'text-green-500'
  if (improvement > 0) return 'text-green-400'
  if (improvement === 0) return 'text-muted-foreground'
  return 'text-red-500'
}

export function getImprovementLabel(improvement: number): string {
  if (improvement > 20) return 'Excellent'
  if (improvement > 10) return 'Good'
  if (improvement > 0) return 'Minor'
  if (improvement === 0) return 'No change'
  return 'Worse'
}
