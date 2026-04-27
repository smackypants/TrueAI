import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useDynamicUI } from '@/hooks/use-dynamic-ui'
import { Palette, Layout, Sparkle, Type, Square } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export function DynamicUICustomizer() {
  const { preferences, updatePreference, setPreferences } = useDynamicUI()

  if (!preferences) return null

  const presetThemes = [
    {
      name: 'Default',
      preferences: {
        colorScheme: 'default' as const,
        cardStyle: 'elevated' as const,
        backgroundPattern: 'dots' as const,
        accentColor: 'oklch(0.75 0.14 200)',
      }
    },
    {
      name: 'Minimal',
      preferences: {
        colorScheme: 'minimal' as const,
        cardStyle: 'flat' as const,
        backgroundPattern: 'none' as const,
        accentColor: 'oklch(0.50 0.05 260)',
      }
    },
    {
      name: 'Vibrant',
      preferences: {
        colorScheme: 'vibrant' as const,
        cardStyle: 'glass' as const,
        backgroundPattern: 'gradient' as const,
        accentColor: 'oklch(0.70 0.20 330)',
      }
    },
    {
      name: 'High Contrast',
      preferences: {
        colorScheme: 'high-contrast' as const,
        cardStyle: 'bordered' as const,
        backgroundPattern: 'grid' as const,
        accentColor: 'oklch(0.85 0.25 140)',
      }
    },
  ]

  const applyPreset = (preset: typeof presetThemes[0]) => {
    setPreferences(prev => ({ ...prev, ...preset.preferences }))
    toast.success(`Applied ${preset.name} theme`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Dynamic UI Customization</h3>
        <p className="text-sm text-muted-foreground">
          Personalize your interface with adaptive layouts and styling
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {presetThemes.map((preset) => (
          <motion.div
            key={preset.name}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="outline"
              className="w-full h-20 flex-col gap-2"
              onClick={() => applyPreset(preset)}
            >
              <Sparkle size={24} weight="fill" />
              <span className="text-xs">{preset.name}</span>
            </Button>
          </motion.div>
        ))}
      </div>

      <Separator />

      <Tabs defaultValue="layout" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="layout" className="gap-2">
            <Layout size={16} />
            <span className="hidden sm:inline">Layout</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette size={16} />
            <span className="hidden sm:inline">Style</span>
          </TabsTrigger>
          <TabsTrigger value="typography" className="gap-2">
            <Type size={16} />
            <span className="hidden sm:inline">Text</span>
          </TabsTrigger>
          <TabsTrigger value="effects" className="gap-2">
            <Sparkle size={16} />
            <span className="hidden sm:inline">Effects</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="space-y-6 mt-6">
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Layout Density</Label>
              <Select
                value={preferences.layoutDensity}
                onValueChange={(value: 'compact' | 'comfortable' | 'spacious') => updatePreference('layoutDensity', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="spacious">Spacious</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Adjust spacing between elements
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Sidebar Position</Label>
              <Select
                value={preferences.sidebarPosition}
                onValueChange={(value: 'left' | 'right') => updatePreference('sidebarPosition', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Adapt Layout</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically adjust layout based on screen size
                </p>
              </div>
              <Switch
                checked={preferences.autoAdaptLayout}
                onCheckedChange={(checked) => updatePreference('autoAdaptLayout', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Smart Spacing</Label>
                <p className="text-xs text-muted-foreground">
                  Dynamic spacing based on content density
                </p>
              </div>
              <Switch
                checked={preferences.smartSpacing}
                onCheckedChange={(checked) => updatePreference('smartSpacing', checked)}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6 mt-6">
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Color Scheme</Label>
              <Select
                value={preferences.colorScheme}
                onValueChange={(value: 'default' | 'vibrant' | 'minimal' | 'high-contrast') => updatePreference('colorScheme', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="vibrant">Vibrant</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="high-contrast">High Contrast</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Card Style</Label>
              <Select
                value={preferences.cardStyle}
                onValueChange={(value: 'flat' | 'elevated' | 'bordered' | 'glass') => updatePreference('cardStyle', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="elevated">Elevated</SelectItem>
                  <SelectItem value="bordered">Bordered</SelectItem>
                  <SelectItem value="glass">Glass</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Background Pattern</Label>
              <Select
                value={preferences.backgroundPattern}
                onValueChange={(value: 'none' | 'dots' | 'grid' | 'waves' | 'gradient') => updatePreference('backgroundPattern', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="dots">Dots</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="waves">Waves</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Chat Bubble Style</Label>
              <Select
                value={preferences.chatBubbleStyle}
                onValueChange={(value: 'rounded' | 'sharp' | 'minimal') => updatePreference('chatBubbleStyle', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rounded">Rounded</SelectItem>
                  <SelectItem value="sharp">Sharp</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Contextual Colors</Label>
                <p className="text-xs text-muted-foreground">
                  Color-code elements by type and status
                </p>
              </div>
              <Switch
                checked={preferences.contextualColors}
                onCheckedChange={(checked) => updatePreference('contextualColors', checked)}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="typography" className="space-y-6 mt-6">
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Font Size</Label>
              <Select
                value={preferences.fontSize}
                onValueChange={(value: 'small' | 'medium' | 'large' | 'xlarge') => updatePreference('fontSize', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="xlarge">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Typography Preview</Label>
              <div className={`space-y-2 p-4 bg-muted/30 rounded-lg ${preferences.fontSize === 'small' ? 'text-sm' : preferences.fontSize === 'large' ? 'text-lg' : preferences.fontSize === 'xlarge' ? 'text-xl' : 'text-base'}`}>
                <h4 className="font-semibold">Sample Heading</h4>
                <p className="text-muted-foreground">
                  This is how your text will appear with the current settings.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="effects" className="space-y-6 mt-6">
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Animation Intensity</Label>
              <Select
                value={preferences.animationIntensity}
                onValueChange={(value: 'none' | 'subtle' | 'normal' | 'enhanced') => updatePreference('animationIntensity', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="subtle">Subtle</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="enhanced">Enhanced</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Control motion and transitions throughout the interface
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Animation Preview</Label>
              <div className="flex gap-2">
                {preferences.animationIntensity !== 'none' && (
                  <>
                    <motion.div
                      className="h-16 w-16 bg-primary rounded-lg flex items-center justify-center"
                      animate={{
                        scale: preferences.animationIntensity === 'enhanced' ? [1, 1.1, 1] : [1, 1.05, 1],
                        rotate: preferences.animationIntensity === 'enhanced' ? [0, 5, 0] : 0,
                      }}
                      transition={{
                        duration: preferences.animationIntensity === 'subtle' ? 2 : preferences.animationIntensity === 'enhanced' ? 1 : 1.5,
                        repeat: Infinity,
                      }}
                    >
                      <Square size={24} className="text-primary-foreground" weight="fill" />
                    </motion.div>
                  </>
                )}
                {preferences.animationIntensity === 'none' && (
                  <div className="h-16 w-16 bg-primary rounded-lg flex items-center justify-center">
                    <Square size={24} className="text-primary-foreground" weight="fill" />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setPreferences({
              layoutDensity: 'comfortable',
              colorScheme: 'default',
              sidebarPosition: 'left',
              chatBubbleStyle: 'rounded',
              animationIntensity: 'normal',
              fontSize: 'medium',
              cardStyle: 'elevated',
              accentColor: 'oklch(0.75 0.14 200)',
              backgroundPattern: 'dots',
              autoAdaptLayout: true,
              smartSpacing: true,
              contextualColors: true,
            })
            toast.success('Reset to default settings')
          }}
          className="flex-1"
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  )
}
