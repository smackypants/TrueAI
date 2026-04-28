import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Gear, Palette, Bell, Lock, Database, Sparkle, Lightning, Cpu} from '@phosphor-icons/react'
import { GeneralSettings } from './GeneralSettings'
import { AppearanceSettings } from './AppearanceSettings'
import { NotificationSettings } from './NotificationSettings'
import { PrivacySettings } from './PrivacySettings'
import { DataSettings } from './DataSettings'
import { AdvancedSettings } from './AdvancedSettings'
import { AISettings } from './AISettings'
import { LLMRuntimeSettings } from './LLMRuntimeSettings'
import { useIsMobile } from '@/hooks/use-mobile'
import type { AppSettings } from '@/lib/types'

interface SettingsMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: AppSettings
  onSettingsChange: (settings: AppSettings) => void
}

export function SettingsMenu({ open, onOpenChange, settings, onSettingsChange }: SettingsMenuProps) {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState('general')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Gear weight="fill" size={24} className="text-white" />
            </div>
            Settings
          </DialogTitle>
          <DialogDescription>
            Customize your TrueAI LocalAI experience
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col lg:flex-row">
            {!isMobile && (
              <div className="w-56 border-r border-border bg-muted/20">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-1">
                    <SettingsTabButton
                      value="general"
                      activeTab={activeTab}
                      icon={<Gear weight="fill" size={20} />}
                      label="General"
                      onValueChange={setActiveTab}
                    />
                    <SettingsTabButton
                      value="appearance"
                      activeTab={activeTab}
                      icon={<Palette weight="fill" size={20} />}
                      label="Appearance"
                      onValueChange={setActiveTab}
                    />
                    <SettingsTabButton
                      value="ai"
                      activeTab={activeTab}
                      icon={<Sparkle weight="fill" size={20} />}
                      label="AI Behavior"
                      onValueChange={setActiveTab}
                    />
                    <SettingsTabButton
                      value="llm-runtime"
                      activeTab={activeTab}
                      icon={<Cpu weight="fill" size={20} />}
                      label="LLM Runtime"
                      onValueChange={setActiveTab}
                    />
                    <SettingsTabButton
                      value="notifications"
                      activeTab={activeTab}
                      icon={<Bell weight="fill" size={20} />}
                      label="Notifications"
                      onValueChange={setActiveTab}
                    />
                    <SettingsTabButton
                      value="privacy"
                      activeTab={activeTab}
                      icon={<Lock weight="fill" size={20} />}
                      label="Privacy & Security"
                      onValueChange={setActiveTab}
                    />
                    <SettingsTabButton
                      value="data"
                      activeTab={activeTab}
                      icon={<Database weight="fill" size={20} />}
                      label="Data Management"
                      onValueChange={setActiveTab}
                    />
                    <SettingsTabButton
                      value="advanced"
                      activeTab={activeTab}
                      icon={<Lightning weight="fill" size={20} />}
                      label="Advanced"
                      onValueChange={setActiveTab}
                    />
                  </div>
                </ScrollArea>
              </div>
            )}

            {isMobile && (
              <TabsList className="w-full grid grid-cols-4 lg:hidden mx-4 mt-2 mb-4">
                <TabsTrigger value="general" className="gap-1 text-xs">
                  <Gear size={16} />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="gap-1 text-xs">
                  <Palette size={16} />
                  <span className="hidden sm:inline">Theme</span>
                </TabsTrigger>
                <TabsTrigger value="ai" className="gap-1 text-xs">
                  <Sparkle size={16} />
                  <span className="hidden sm:inline">AI</span>
                </TabsTrigger>
                <TabsTrigger value="data" className="gap-1 text-xs">
                  <Database size={16} />
                  <span className="hidden sm:inline">Data</span>
                </TabsTrigger>
              </TabsList>
            )}

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <TabsContent value="general" className="mt-0">
                    <GeneralSettings settings={settings} onSettingsChange={onSettingsChange} />
                  </TabsContent>

                  <TabsContent value="appearance" className="mt-0">
                    <AppearanceSettings settings={settings} onSettingsChange={onSettingsChange} />
                  </TabsContent>

                  <TabsContent value="ai" className="mt-0">
                    <AISettings settings={settings} onSettingsChange={onSettingsChange} />
                  </TabsContent>

                  <TabsContent value="llm-runtime" className="mt-0">
                    <LLMRuntimeSettings />
                  </TabsContent>

                  <TabsContent value="notifications" className="mt-0">
                    <NotificationSettings settings={settings} onSettingsChange={onSettingsChange} />
                  </TabsContent>

                  <TabsContent value="privacy" className="mt-0">
                    <PrivacySettings settings={settings} onSettingsChange={onSettingsChange} />
                  </TabsContent>

                  <TabsContent value="data" className="mt-0">
                    <DataSettings settings={settings} onSettingsChange={onSettingsChange} />
                  </TabsContent>

                  <TabsContent value="advanced" className="mt-0">
                    <AdvancedSettings settings={settings} onSettingsChange={onSettingsChange} />
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SettingsTabButton({ value, activeTab, icon, label, onValueChange }: { value: string; activeTab: string; icon: React.ReactNode; label: string; onValueChange: (value: string) => void }) {
  const isActive = activeTab === value
  
  return (
    <button
      data-state={isActive ? 'active' : 'inactive'}
      onClick={() => onValueChange(value)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:bg-accent/50 text-left"
    >
      {icon}
      {label}
    </button>
  )
}
