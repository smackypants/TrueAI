import { useMemo } from 'react'

interface ModelUsageChartProps {
  data: { model: string; count: number }[]
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

export function ModelUsageChart({ data }: ModelUsageChartProps) {
  const _total = useMemo(() => {
    return data.reduce((sum, d) => sum + d.count, 0)
  }, [data])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No data available
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.count), 1)
  const barHeight = 40
  const chartHeight = data.length * (barHeight + 12) + 20

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 400 ${chartHeight}`} className="w-full">
        {data.map((item, index) => {
          const percentage = (item.count / maxValue) * 100
          const width = (percentage / 100) * 300
          const y = index * (barHeight + 12) + 10

          return (
            <g key={index}>
              <rect
                x="0"
                y={y}
                width={width}
                height={barHeight}
                fill={COLORS[index % COLORS.length]}
                rx="4"
              >
                <title>{`${item.model}: ${item.count} uses`}</title>
              </rect>
              <text
                x="10"
                y={y + barHeight / 2}
                dominantBaseline="middle"
                className="text-xs font-medium"
                fill="currentColor"
              >
                {item.model}
              </text>
              <text
                x={width + 10}
                y={y + barHeight / 2}
                dominantBaseline="middle"
                className="text-xs"
                fill="currentColor"
              >
                {item.count}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
