import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useKV } from '@github/spark/hooks'
import { Palette, Eye, Sparkle, Download, Upload, Trash, Check, Copy, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface ThemeColors {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  border: string
  input: string
  ring: string
  radius: string
}

interface CustomTheme {
  id: string
  name: string
  colors: ThemeColors
  createdAt: number
  isActive?: boolean
}

const DEFAULT_THEMES: Omit<CustomTheme, 'id' | 'createdAt'>[] = [
  {
    name: 'Deep Ocean',
    isActive: false,
    colors: {
      background: 'oklch(0.18 0.01 260)',
      foreground: 'oklch(0.95 0.01 200)',
      card: 'oklch(0.25 0.01 260)',
      cardForeground: 'oklch(0.85 0.01 260)',
      popover: 'oklch(0.22 0.01 260)',
      popoverForeground: 'oklch(0.95 0.01 200)',
      primary: 'oklch(0.45 0.15 260)',
      primaryForeground: 'oklch(0.99 0 0)',
      secondary: 'oklch(0.30 0.02 260)',
      secondaryForeground: 'oklch(0.85 0.01 260)',
      muted: 'oklch(0.22 0.01 260)',
      mutedForeground: 'oklch(0.55 0.01 260)',
      accent: 'oklch(0.75 0.14 200)',
      accentForeground: 'oklch(0.18 0.01 260)',
      destructive: 'oklch(0.55 0.22 25)',
      destructiveForeground: 'oklch(0.99 0 0)',
      border: 'oklch(0.30 0.01 260)',
      input: 'oklch(0.30 0.02 260)',
      ring: 'oklch(0.75 0.14 200)',
      radius: '0.625rem'
    }
  },
  {
    name: 'Forest Night',
    isActive: false,
    colors: {
      background: 'oklch(0.15 0.02 150)',
      foreground: 'oklch(0.95 0.01 150)',
      card: 'oklch(0.22 0.03 150)',
      cardForeground: 'oklch(0.88 0.01 150)',
      popover: 'oklch(0.20 0.02 150)',
      popoverForeground: 'oklch(0.95 0.01 150)',
      primary: 'oklch(0.55 0.15 140)',
      primaryForeground: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.28 0.03 150)',
      secondaryForeground: 'oklch(0.88 0.01 150)',
      muted: 'oklch(0.20 0.02 150)',
      mutedForeground: 'oklch(0.52 0.02 150)',
      accent: 'oklch(0.68 0.16 130)',
      accentForeground: 'oklch(0.15 0.02 150)',
      destructive: 'oklch(0.58 0.20 25)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.30 0.02 150)',
      input: 'oklch(0.28 0.03 150)',
      ring: 'oklch(0.68 0.16 130)',
      radius: '0.5rem'
    }
  },
  {
    name: 'Sunset Glow',
    isActive: false,
    colors: {
      background: 'oklch(0.20 0.03 30)',
      foreground: 'oklch(0.96 0.01 30)',
      card: 'oklch(0.28 0.04 30)',
      cardForeground: 'oklch(0.90 0.01 30)',
      popover: 'oklch(0.25 0.03 30)',
      popoverForeground: 'oklch(0.96 0.01 30)',
      primary: 'oklch(0.62 0.20 40)',
      primaryForeground: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.35 0.05 30)',
      secondaryForeground: 'oklch(0.90 0.01 30)',
      muted: 'oklch(0.25 0.03 30)',
      mutedForeground: 'oklch(0.58 0.03 30)',
      accent: 'oklch(0.70 0.18 50)',
      accentForeground: 'oklch(0.20 0.03 30)',
      destructive: 'oklch(0.55 0.22 25)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.35 0.03 30)',
      input: 'oklch(0.35 0.05 30)',
      ring: 'oklch(0.70 0.18 50)',
      radius: '0.75rem'
    }
  },
  {
    name: 'Purple Dream',
    isActive: false,
    colors: {
      background: 'oklch(0.16 0.02 300)',
      foreground: 'oklch(0.95 0.01 300)',
      card: 'oklch(0.24 0.03 300)',
      cardForeground: 'oklch(0.88 0.01 300)',
      popover: 'oklch(0.21 0.02 300)',
      popoverForeground: 'oklch(0.95 0.01 300)',
      primary: 'oklch(0.58 0.18 300)',
      primaryForeground: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.30 0.04 300)',
      secondaryForeground: 'oklch(0.88 0.01 300)',
      muted: 'oklch(0.21 0.02 300)',
      mutedForeground: 'oklch(0.54 0.02 300)',
      accent: 'oklch(0.72 0.20 320)',
      accentForeground: 'oklch(0.16 0.02 300)',
      destructive: 'oklch(0.56 0.22 25)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.32 0.02 300)',
      input: 'oklch(0.30 0.04 300)',
      ring: 'oklch(0.72 0.20 320)',
      radius: '0.875rem'
    }
  },
  {
    name: 'Cyberpunk',
    isActive: false,
    colors: {
      background: 'oklch(0.12 0.01 280)',
      foreground: 'oklch(0.85 0.15 180)',
      card: 'oklch(0.18 0.02 280)',
      cardForeground: 'oklch(0.85 0.15 180)',
      popover: 'oklch(0.16 0.02 280)',
      popoverForeground: 'oklch(0.85 0.15 180)',
      primary: 'oklch(0.70 0.25 330)',
      primaryForeground: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.25 0.03 280)',
      secondaryForeground: 'oklch(0.85 0.10 180)',
      muted: 'oklch(0.16 0.02 280)',
      mutedForeground: 'oklch(0.50 0.08 180)',
      accent: 'oklch(0.75 0.28 180)',
      accentForeground: 'oklch(0.12 0.01 280)',
      destructive: 'oklch(0.60 0.25 20)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.25 0.15 180)',
      input: 'oklch(0.25 0.08 180)',
      ring: 'oklch(0.75 0.28 180)',
      radius: '0.25rem'
    }
  },
  {
    name: 'Minimal Light',
    isActive: false,
    colors: {
      background: 'oklch(0.98 0 0)',
      foreground: 'oklch(0.15 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.15 0 0)',
      popover: 'oklch(1 0 0)',
      popoverForeground: 'oklch(0.15 0 0)',
      primary: 'oklch(0.25 0 0)',
      primaryForeground: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.95 0 0)',
      secondaryForeground: 'oklch(0.25 0 0)',
      muted: 'oklch(0.96 0 0)',
      mutedForeground: 'oklch(0.50 0 0)',
      accent: 'oklch(0.95 0 0)',
      accentForeground: 'oklch(0.25 0 0)',
      destructive: 'oklch(0.55 0.22 25)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.90 0 0)',
      input: 'oklch(0.90 0 0)',
      ring: 'oklch(0.70 0 0)',
      radius: '0.5rem'
    }
  }
]

export function ThemeSwitcher() {
  const [customThemes, setCustomThemes] = useKV<CustomTheme[]>('custom-themes', [])
  const [activeThemeId, setActiveThemeId] = useKV<string | null>('active-theme-id', null)
  const [previewTheme, setPreviewTheme] = useState<ThemeColors | null>(null)
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newThemeName, setNewThemeName] = useState('')
  const [selectedDefaultTheme, setSelectedDefaultTheme] = useState<typeof DEFAULT_THEMES[0] | null>(null)

  const allThemes = [
    ...(customThemes || []),
    ...DEFAULT_THEMES.map((t, i) => ({
      ...t,
      id: `default-${i}`,
      createdAt: 0
    }))
  ]

  const activeTheme = allThemes.find(t => t.id === activeThemeId)

  const applyThemeColors = (colors: ThemeColors) => {
    const root = document.documentElement
    Object.entries(colors).forEach(([key, value]) => {
      if (key === 'radius') {
        root.style.setProperty('--radius', value)
      } else {
        const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
        root.style.setProperty(cssVarName, value)
      }
    })
  }

  useEffect(() => {
    if (previewTheme) {
      applyThemeColors(previewTheme)
    } else if (activeTheme) {
      applyThemeColors(activeTheme.colors)
    }
  }, [previewTheme, activeTheme])

  const handleActivateTheme = (theme: CustomTheme) => {
    setActiveThemeId(theme.id)
    applyThemeColors(theme.colors)
    toast.success(`Theme "${theme.name}" activated`)
  }

  const handlePreviewTheme = (theme: CustomTheme) => {
    setPreviewTheme(theme.colors)
  }

  const handleStopPreview = () => {
    setPreviewTheme(null)
    if (activeTheme) {
      applyThemeColors(activeTheme.colors)
    }
  }

  const handleCreateTheme = () => {
    if (!newThemeName.trim()) {
      toast.error('Please enter a theme name')
      return
    }

    const baseColors = selectedDefaultTheme?.colors || activeTheme?.colors || DEFAULT_THEMES[0].colors

    const newTheme: CustomTheme = {
      id: `custom-${Date.now()}`,
      name: newThemeName,
      colors: { ...baseColors },
      createdAt: Date.now(),
      isActive: false
    }

    setCustomThemes(prev => [newTheme, ...(prev || [])])
    setEditingTheme(newTheme)
    setCreateDialogOpen(false)
    setNewThemeName('')
    setSelectedDefaultTheme(null)
    toast.success('Theme created')
  }

  const handleSaveTheme = (theme: CustomTheme) => {
    setCustomThemes(prev => 
      (prev || []).map(t => t.id === theme.id ? theme : t)
    )
    setEditingTheme(null)
    toast.success('Theme saved')
  }

  const handleDeleteTheme = (themeId: string) => {
    if (themeId.startsWith('default-')) {
      toast.error('Cannot delete default themes')
      return
    }

    setCustomThemes(prev => (prev || []).filter(t => t.id !== themeId))
    
    if (activeThemeId === themeId) {
      setActiveThemeId(null)
    }
    
    toast.success('Theme deleted')
  }

  const handleExportTheme = (theme: CustomTheme) => {
    const dataStr = JSON.stringify(theme, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${theme.name.toLowerCase().replace(/\s+/g, '-')}-theme.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Theme exported')
  }

  const handleImportTheme = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const theme = JSON.parse(event.target?.result as string)
          const importedTheme: CustomTheme = {
            ...theme,
            id: `custom-${Date.now()}`,
            createdAt: Date.now()
          }
          setCustomThemes(prev => [importedTheme, ...(prev || [])])
          toast.success('Theme imported')
        } catch (error) {
          toast.error('Invalid theme file')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleCopyThemeCode = (theme: CustomTheme) => {
    const cssCode = `:root {
${Object.entries(theme.colors).map(([key, value]) => {
  if (key === 'radius') return `  --radius: ${value};`
  const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
  return `  ${cssVarName}: ${value};`
}).join('\n')}
}`
    navigator.clipboard.writeText(cssCode)
    toast.success('Theme CSS copied to clipboard')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Theme Customization</h3>
          <p className="text-sm text-muted-foreground">
            Create and customize your perfect color scheme
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImportTheme}>
            <Upload size={16} className="mr-2" />
            Import
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus size={16} className="mr-2" />
            Create Theme
          </Button>
        </div>
      </div>

      <Separator />

      {previewTheme && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <Card className="p-4 bg-accent/10 border-accent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye size={20} className="text-accent" />
                <div>
                  <p className="font-medium text-sm">Live Preview Active</p>
                  <p className="text-xs text-muted-foreground">
                    Changes are temporary until you activate the theme
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleStopPreview}>
                Exit Preview
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {editingTheme ? (
        <ThemeEditor
          theme={editingTheme}
          onSave={handleSaveTheme}
          onCancel={() => setEditingTheme(null)}
          onPreview={(colors) => setPreviewTheme(colors)}
        />
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {allThemes.map((theme, index) => (
                <motion.div
                  key={theme.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ThemeCard
                    theme={theme}
                    isActive={theme.id === activeThemeId}
                    isPreviewing={previewTheme !== null}
                    onActivate={() => handleActivateTheme(theme)}
                    onPreview={() => handlePreviewTheme(theme)}
                    onEdit={() => setEditingTheme(theme)}
                    onDelete={() => handleDeleteTheme(theme.id)}
                    onExport={() => handleExportTheme(theme)}
                    onCopyCode={() => handleCopyThemeCode(theme)}
                    isCustom={!theme.id.startsWith('default-')}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Theme</DialogTitle>
            <DialogDescription>
              Start with a base theme and customize it to your liking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="theme-name">Theme Name</Label>
              <Input
                id="theme-name"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="My Custom Theme"
              />
            </div>

            <div className="space-y-2">
              <Label>Base Theme (Optional)</Label>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_THEMES.slice(0, 4).map((theme, index) => (
                  <Button
                    key={index}
                    variant={selectedDefaultTheme === theme ? 'default' : 'outline'}
                    className="h-auto py-3"
                    onClick={() => setSelectedDefaultTheme(theme)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div 
                          className="w-3 h-3 rounded-full border" 
                          style={{ backgroundColor: theme.colors.primary }}
                        />
                        <div 
                          className="w-3 h-3 rounded-full border" 
                          style={{ backgroundColor: theme.colors.accent }}
                        />
                      </div>
                      <span className="text-xs">{theme.name}</span>
                    </div>
                  </Button>
                ))}
              </div>
              {selectedDefaultTheme && (
                <p className="text-xs text-muted-foreground">
                  Starting from: {selectedDefaultTheme.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false)
              setNewThemeName('')
              setSelectedDefaultTheme(null)
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateTheme}>Create & Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ThemeCardProps {
  theme: CustomTheme
  isActive: boolean
  isPreviewing: boolean
  isCustom: boolean
  onActivate: () => void
  onPreview: () => void
  onEdit: () => void
  onDelete: () => void
  onExport: () => void
  onCopyCode: () => void
}

function ThemeCard({ 
  theme, 
  isActive, 
  isPreviewing,
  isCustom,
  onActivate, 
  onPreview, 
  onEdit, 
  onDelete, 
  onExport,
  onCopyCode
}: ThemeCardProps) {
  return (
    <Card className="p-4 space-y-4 hover:shadow-lg transition-shadow relative overflow-hidden group">
      {isActive && (
        <Badge className="absolute top-3 right-3 gap-1">
          <Check size={12} weight="bold" />
          Active
        </Badge>
      )}

      <div className="space-y-2">
        <h4 className="font-semibold truncate pr-16">{theme.name}</h4>
        <div className="flex gap-1.5">
          <ColorSwatch color={theme.colors.primary} label="Primary" />
          <ColorSwatch color={theme.colors.secondary} label="Secondary" />
          <ColorSwatch color={theme.colors.accent} label="Accent" />
          <ColorSwatch color={theme.colors.background} label="Background" />
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {!isActive && (
            <Button size="sm" className="flex-1" onClick={onActivate}>
              <Check size={16} className="mr-2" />
              Activate
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            className={isActive ? 'flex-1' : ''}
            onClick={onPreview}
            disabled={isPreviewing}
          >
            <Eye size={16} className={!isActive ? '' : 'mr-2'} />
            {!isActive && <span className="ml-2">Preview</span>}
            {isActive && <span>Preview</span>}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {isCustom && (
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Palette size={14} className="mr-1.5" />
              Edit
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onExport}>
            <Download size={14} className="mr-1.5" />
            Export
          </Button>
          <Button size="sm" variant="ghost" onClick={onCopyCode}>
            <Copy size={14} className="mr-1.5" />
            Copy CSS
          </Button>
          {isCustom && (
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash size={14} className="mr-1.5" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

interface ColorSwatchProps {
  color: string
  label: string
}

function ColorSwatch({ color, label }: ColorSwatchProps) {
  return (
    <div className="flex-1 group/swatch relative">
      <div 
        className="w-full h-12 rounded-md border-2 border-border transition-transform group-hover/swatch:scale-105 cursor-pointer"
        style={{ backgroundColor: color }}
        title={label}
      />
      <p className="text-[10px] text-center text-muted-foreground mt-1 truncate">
        {label}
      </p>
    </div>
  )
}

interface ThemeEditorProps {
  theme: CustomTheme
  onSave: (theme: CustomTheme) => void
  onCancel: () => void
  onPreview: (colors: ThemeColors) => void
}

function ThemeEditor({ theme, onSave, onCancel, onPreview }: ThemeEditorProps) {
  const [editedTheme, setEditedTheme] = useState<CustomTheme>(theme)
  const [activeColorGroup, setActiveColorGroup] = useState<'background' | 'action' | 'semantic'>('background')

  const updateColor = (key: keyof ThemeColors, value: string) => {
    const updated = {
      ...editedTheme,
      colors: {
        ...editedTheme.colors,
        [key]: value
      }
    }
    setEditedTheme(updated)
    onPreview(updated.colors)
  }

  const handleSave = () => {
    onSave(editedTheme)
  }

  const colorGroups = {
    background: [
      { key: 'background' as const, label: 'Background', description: 'Main page background' },
      { key: 'foreground' as const, label: 'Foreground', description: 'Main text color' },
      { key: 'card' as const, label: 'Card', description: 'Card backgrounds' },
      { key: 'cardForeground' as const, label: 'Card Text', description: 'Text on cards' },
      { key: 'popover' as const, label: 'Popover', description: 'Popover backgrounds' },
      { key: 'popoverForeground' as const, label: 'Popover Text', description: 'Text on popovers' },
    ],
    action: [
      { key: 'primary' as const, label: 'Primary', description: 'Primary action color' },
      { key: 'primaryForeground' as const, label: 'Primary Text', description: 'Text on primary' },
      { key: 'secondary' as const, label: 'Secondary', description: 'Secondary actions' },
      { key: 'secondaryForeground' as const, label: 'Secondary Text', description: 'Text on secondary' },
      { key: 'accent' as const, label: 'Accent', description: 'Highlight color' },
      { key: 'accentForeground' as const, label: 'Accent Text', description: 'Text on accent' },
      { key: 'muted' as const, label: 'Muted', description: 'Subdued backgrounds' },
      { key: 'mutedForeground' as const, label: 'Muted Text', description: 'Muted text' },
    ],
    semantic: [
      { key: 'destructive' as const, label: 'Destructive', description: 'Danger/error color' },
      { key: 'destructiveForeground' as const, label: 'Destructive Text', description: 'Text on destructive' },
      { key: 'border' as const, label: 'Border', description: 'Border color' },
      { key: 'input' as const, label: 'Input', description: 'Input border' },
      { key: 'ring' as const, label: 'Focus Ring', description: 'Focus indicator' },
      { key: 'radius' as const, label: 'Border Radius', description: 'Corner roundness' },
    ]
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Editing: {editedTheme.name}</h3>
          <p className="text-sm text-muted-foreground">
            Customize individual colors for your theme
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave}>
            <Check size={16} className="mr-2" />
            Save Theme
          </Button>
        </div>
      </div>

      <Separator />

      <Tabs value={activeColorGroup} onValueChange={(v) => setActiveColorGroup(v as any)}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="background">Background</TabsTrigger>
          <TabsTrigger value="action">Actions</TabsTrigger>
          <TabsTrigger value="semantic">System</TabsTrigger>
        </TabsList>

        <TabsContent value="background" className="space-y-4 mt-6">
          {colorGroups.background.map(({ key, label, description }) => (
            <ColorPicker
              key={key}
              label={label}
              description={description}
              value={editedTheme.colors[key]}
              onChange={(value) => updateColor(key, value)}
            />
          ))}
        </TabsContent>

        <TabsContent value="action" className="space-y-4 mt-6">
          {colorGroups.action.map(({ key, label, description }) => (
            <ColorPicker
              key={key}
              label={label}
              description={description}
              value={editedTheme.colors[key]}
              onChange={(value) => updateColor(key, value)}
            />
          ))}
        </TabsContent>

        <TabsContent value="semantic" className="space-y-4 mt-6">
          {colorGroups.semantic.map(({ key, label, description }) => (
            <ColorPicker
              key={key}
              label={label}
              description={description}
              value={editedTheme.colors[key]}
              onChange={(value) => updateColor(key, value)}
              isRadius={key === 'radius'}
            />
          ))}
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="space-y-4">
        <h4 className="font-medium">Theme Preview</h4>
        <Card className="p-6 space-y-4 bg-background">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkle size={20} weight="fill" className="text-primary-foreground" />
            </div>
            <div>
              <h5 className="font-semibold text-foreground">Preview Component</h5>
              <p className="text-sm text-muted-foreground">See how your theme looks</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm">Primary Button</Button>
            <Button size="sm" variant="secondary">Secondary</Button>
            <Button size="sm" variant="outline">Outline</Button>
            <Button size="sm" variant="destructive">Danger</Button>
          </div>
          <Card className="p-4 bg-card">
            <p className="text-sm text-card-foreground">
              This is a card with text content to preview foreground colors.
            </p>
          </Card>
        </Card>
      </div>
    </Card>
  )
}

interface ColorPickerProps {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
  isRadius?: boolean
}

function ColorPicker({ label, description, value, onChange, isRadius }: ColorPickerProps) {
  const [localValue, setLocalValue] = useState(value)

  const handleChange = (newValue: string) => {
    setLocalValue(newValue)
    onChange(newValue)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {!isRadius && (
          <div 
            className="w-12 h-12 rounded-lg border-2 border-border flex-shrink-0 ml-4"
            style={{ backgroundColor: localValue }}
          />
        )}
      </div>
      <Input
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={isRadius ? "0.5rem" : "oklch(0.5 0.1 200)"}
        className="font-mono text-sm"
      />
      {!isRadius && (
        <div className="flex gap-2 flex-wrap">
          {['oklch(0.20 0.03 260)', 'oklch(0.50 0.15 200)', 'oklch(0.70 0.20 340)', 'oklch(0.95 0.01 200)'].map((preset, i) => (
            <Button
              key={i}
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => handleChange(preset)}
            >
              <div 
                className="w-3 h-3 rounded border mr-1.5" 
                style={{ backgroundColor: preset }}
              />
              Preset {i + 1}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
