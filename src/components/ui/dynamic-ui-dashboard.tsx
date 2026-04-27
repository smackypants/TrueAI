// import { Card } from '@/components/ui/card'
// import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useDynamicUI } from '@/hooks/use-dynamic-ui'
import { useContextualUI } from '@/hooks/use-contextual-ui'
import { SmartContainer, DynamicCard, AdaptiveText, ResponsiveSpacer } from '@/components/ui/smart-layout'
import { TrendUp, Clock, Eye, Brain, ChartBar, Lightbulb } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

export function DynamicUIDashboard() {
  const { preferences, adaptiveLayout, usage } = useDynamicUI()
  const { behavior, suggestions, getRecommendedFeatures } = useContextualUI()

  if (!preferences || !behavior) return null

  const mostUsedFeatures = Object.entries(usage?.mostUsedTabs || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const recommendedFeatures = getRecommendedFeatures()

  const avgSessionDuration = behavior.sessionDuration.length > 0
    ? behavior.sessionDuration.reduce((a, b) => a + b, 0) / behavior.sessionDuration.length / 60000
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Dynamic UI Dashboard</h2>
        <p className="text-muted-foreground">
          Real-time insights about your UI preferences and usage patterns
        </p>
      </div>

      <ResponsiveSpacer size="medium" />

      <SmartContainer variant="grid" adaptiveColumns>
        <DynamicCard hoverable contextColor="info">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Eye size={24} className="text-primary" weight="fill" />
            </div>
            <div className="flex-1 min-w-0">
              <AdaptiveText variant="caption">Current Layout</AdaptiveText>
              <AdaptiveText variant="heading" className="text-2xl mt-1">
                {adaptiveLayout.columnCount} Columns
              </AdaptiveText>
              <p className="text-xs text-muted-foreground mt-1">
                {adaptiveLayout.compactMode ? 'Compact Mode' : 'Comfortable Mode'}
              </p>
            </div>
          </div>
        </DynamicCard>

        <DynamicCard hoverable contextColor="success">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <TrendUp size={24} className="text-green-500" weight="fill" />
            </div>
            <div className="flex-1 min-w-0">
              <AdaptiveText variant="caption">Card Style</AdaptiveText>
              <AdaptiveText variant="heading" className="text-2xl mt-1 capitalize">
                {preferences.cardStyle}
              </AdaptiveText>
              <p className="text-xs text-muted-foreground mt-1">
                {preferences.colorScheme} theme
              </p>
            </div>
          </div>
        </DynamicCard>

        <DynamicCard hoverable contextColor="warning">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
              <Clock size={24} className="text-yellow-500" weight="fill" />
            </div>
            <div className="flex-1 min-w-0">
              <AdaptiveText variant="caption">Avg Session</AdaptiveText>
              <AdaptiveText variant="heading" className="text-2xl mt-1">
                {avgSessionDuration.toFixed(0)}m
              </AdaptiveText>
              <p className="text-xs text-muted-foreground mt-1">
                {behavior.sessionDuration.length} sessions tracked
              </p>
            </div>
          </div>
        </DynamicCard>
      </SmartContainer>

      <ResponsiveSpacer size="large" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DynamicCard>
          <div className="flex items-center gap-2 mb-4">
            <ChartBar size={20} weight="fill" className="text-primary" />
            <AdaptiveText variant="heading">Most Used Features</AdaptiveText>
          </div>
          <div className="space-y-3">
            {mostUsedFeatures.length > 0 ? (
              mostUsedFeatures.map(([feature, count]) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-1"
                >
                  <div className="flex justify-between items-center text-sm">
                    <span className="capitalize">{feature}</span>
                    <Badge variant="outline">{count} uses</Badge>
                  </div>
                  <Progress 
                    value={(count / Math.max(...mostUsedFeatures.map(([, c]) => c))) * 100} 
                    className="h-2"
                  />
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Start using features to see your usage patterns
              </p>
            )}
          </div>
        </DynamicCard>

        <DynamicCard>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={20} weight="fill" className="text-yellow-500" />
            <AdaptiveText variant="heading">Smart Suggestions</AdaptiveText>
          </div>
          <div className="space-y-3">
            {suggestions.length > 0 ? (
              suggestions.slice(0, 3).map((suggestion) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-accent/10 rounded-lg space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {suggestion.type}
                    </Badge>
                    <span className="text-sm font-medium">{suggestion.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No suggestions at the moment
              </p>
            )}
          </div>
        </DynamicCard>
      </div>

      <ResponsiveSpacer size="medium" />

      {recommendedFeatures.length > 0 && (
        <DynamicCard contextColor="info">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={20} weight="fill" className="text-blue-500" />
            <AdaptiveText variant="heading">Unexplored Features</AdaptiveText>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Discover features you haven't tried yet
          </p>
          <div className="flex flex-wrap gap-2">
            {recommendedFeatures.map((feature) => (
              <Badge key={feature} variant="outline" className="capitalize">
                {feature}
              </Badge>
            ))}
          </div>
        </DynamicCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DynamicCard>
          <AdaptiveText variant="caption">Layout Density</AdaptiveText>
          <AdaptiveText variant="heading" className="capitalize mt-2">
            {preferences.layoutDensity}
          </AdaptiveText>
        </DynamicCard>

        <DynamicCard>
          <AdaptiveText variant="caption">Animation Level</AdaptiveText>
          <AdaptiveText variant="heading" className="capitalize mt-2">
            {preferences.animationIntensity}
          </AdaptiveText>
        </DynamicCard>

        <DynamicCard>
          <AdaptiveText variant="caption">Font Size</AdaptiveText>
          <AdaptiveText variant="heading" className="capitalize mt-2">
            {preferences.fontSize}
          </AdaptiveText>
        </DynamicCard>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Auto-Adapt Layout</h3>
          <p className="text-sm text-muted-foreground">
            {preferences.autoAdaptLayout ? 'Enabled' : 'Disabled'}
          </p>
        </div>
        <Badge variant={preferences.autoAdaptLayout ? 'default' : 'secondary'}>
          {preferences.autoAdaptLayout ? 'Active' : 'Inactive'}
        </Badge>
      </div>
    </div>
  )
}
