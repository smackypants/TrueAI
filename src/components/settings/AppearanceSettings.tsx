import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Moon, Sun, Monitor, Palette, Sliders } from '@phosphor-icons/react'
import { ThemeSwitcher } from './ThemeSwitcher'
import type { AppSettings } from '@/lib/types'

interface AppearanceSettingsProps {
  settings: AppSettings
  onSettingsChange: (settings: AppSettings) => void
}

export function AppearanceSettings({ settings, onSettingsChange }: AppearanceSettingsProps) {
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Appearance Settings</h3>
        <p className="text-sm text-muted-foreground">
          Customize the look and feel of your interface
        </p>
      </div>

      <Separator />

      <Tabs defaultValue="colors" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="colors" className="gap-2">
            <Palette size={18} />
            Colors & Themes
          </TabsTrigger>
          <TabsTrigger value="display" className="gap-2">
            <Sliders size={18} />
            Display Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-6 mt-6">
          <ThemeSwitcher />
        </TabsContent>

        <TabsContent value="display" className="space-y-6 mt-6">
          <Card className="p-4 space-y-4">
            <div>
              <h4 className="font-medium mb-4">Theme Mode</h4>
              
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={settings.theme === 'light' ? 'default' : 'outline'}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => updateSetting('theme', 'light')}
                >
                  <Sun size={24} weight="fill" />
                  <span className="text-xs">Light</span>
                </Button>
                
                <Button
                  variant={settings.theme === 'dark' ? 'default' : 'outline'}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => updateSetting('theme', 'dark')}
                >
                  <Moon size={24} weight="fill" />
                  <span className="text-xs">Dark</span>
                </Button>
                
                <Button
                  variant={settings.theme === 'system' ? 'default' : 'outline'}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => updateSetting('theme', 'system')}
                >
                  <Monitor size={24} weight="fill" />
                  <span className="text-xs">System</span>
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div>
              <h4 className="font-medium mb-4">Display</h4>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="font-size">Font size</Label>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-16">Small</span>
                    <Slider
                      id="font-size"
                      min={12}
                      max={20}
                      step={1}
                      value={[settings.fontSize]}
                      onValueChange={([value]) => updateSetting('fontSize', value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-16 text-right">Large</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Current: {settings.fontSize}px</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="ui-density">Interface density</Label>
                  <Select
                    value={settings.density}
                    onValueChange={(value: AppSettings['density']) => updateSetting('density', value)}
                  >
                    <SelectTrigger id="ui-density">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Adjust spacing and padding throughout the app
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-timestamps">Show timestamps</Label>
                    <p className="text-sm text-muted-foreground">
                      Display message timestamps
                    </p>
                  </div>
                  <Switch
                    id="show-timestamps"
                    checked={settings.showTimestamps}
                    onCheckedChange={(checked) => updateSetting('showTimestamps', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-avatars">Show avatars</Label>
                    <p className="text-sm text-muted-foreground">
                      Display user and AI avatars in chat
                    </p>
                  </div>
                  <Switch
                    id="show-avatars"
                    checked={settings.showAvatars}
                    onCheckedChange={(checked) => updateSetting('showAvatars', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="compact-mode">Compact sidebar</Label>
                    <p className="text-sm text-muted-foreground">
                      Collapse sidebar by default
                    </p>
                  </div>
                  <Switch
                    id="compact-mode"
                    checked={settings.compactSidebar}
                    onCheckedChange={(checked) => updateSetting('compactSidebar', checked)}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div>
              <h4 className="font-medium mb-4">Animations</h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable-animations">Enable animations</Label>
                    <p className="text-sm text-muted-foreground">
                      Show smooth transitions and effects
                    </p>
                  </div>
                  <Switch
                    id="enable-animations"
                    checked={settings.enableAnimations}
                    onCheckedChange={(checked) => updateSetting('enableAnimations', checked)}
                  />
                </div>

                {settings.enableAnimations && (
                  <>
                    <Separator />
                    
                    <div className="space-y-2">
                      <Label htmlFor="animation-speed">Animation speed</Label>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground w-16">Slow</span>
                        <Slider
                          id="animation-speed"
                          min={0.5}
                          max={2}
                          step={0.1}
                          value={[settings.animationSpeed]}
                          onValueChange={([value]) => updateSetting('animationSpeed', value)}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground w-16 text-right">Fast</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Current: {settings.animationSpeed}x</p>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="reduce-motion">Reduce motion</Label>
                        <p className="text-sm text-muted-foreground">
                          Minimize animations for accessibility
                        </p>
                      </div>
                      <Switch
                        id="reduce-motion"
                        checked={settings.reduceMotion}
                        onCheckedChange={(checked) => updateSetting('reduceMotion', checked)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
