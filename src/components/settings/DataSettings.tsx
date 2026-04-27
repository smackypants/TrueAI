import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Trash, Download, Upload, Database } from '@phosphor-icons/react'
import type { AppSettings } from '@/lib/types'

interface DataSettingsProps {
  settings: AppSettings
  onSettingsChange: (_settings: AppSettings) => void
}

export function DataSettings({ onSettingsChange: _onSettingsChange }: DataSettingsProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const allKeys = await spark.kv.keys()
      const exportData: Record<string, unknown> = {}
      
      for (const key of allKeys) {
        const value = await spark.kv.get(key)
        exportData[key] = value
      }
      
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `trueai-backup-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
      
      toast.success('Data exported successfully')
    } catch (error) {
      toast.error('Failed to export data')
      console.error(error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportData = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsImporting(true)
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        
        for (const [key, value] of Object.entries(data)) {
          await spark.kv.set(key, value)
        }
        
        toast.success('Data imported successfully')
        window.location.reload()
      } catch (error) {
        toast.error('Failed to import data')
        console.error(error)
      } finally {
        setIsImporting(false)
      }
    }
    input.click()
  }

  const handleClearAllData = async () => {
    if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return
    }

    setIsClearing(true)
    try {
      const allKeys = await spark.kv.keys()
      for (const key of allKeys) {
        await spark.kv.delete(key)
      }
      
      toast.success('All data cleared')
      window.location.reload()
    } catch (error) {
      toast.error('Failed to clear data')
      console.error(error)
    } finally {
      setIsClearing(false)
    }
  }

  const estimatedDataSize = 2.4

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Data Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage your stored data and backups
        </p>
      </div>

      <Separator />

      <Card className="p-4 space-y-4">
        <div>
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Database size={20} weight="fill" className="text-primary" />
            Storage Usage
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Data stored</span>
              <span className="font-medium">{estimatedDataSize.toFixed(1)} MB</span>
            </div>
            
            <Progress value={24} className="h-2" />
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Conversations</p>
                <p className="text-sm font-medium">1.2 MB</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Agents</p>
                <p className="text-sm font-medium">0.8 MB</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Models</p>
                <p className="text-sm font-medium">0.3 MB</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Settings</p>
                <p className="text-sm font-medium">0.1 MB</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <h4 className="font-medium mb-4">Backup & Restore</h4>
          
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleExportData}
              disabled={isExporting}
            >
              <Download size={20} className="mr-2" weight="bold" />
              {isExporting ? 'Exporting...' : 'Export All Data'}
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleImportData}
              disabled={isImporting}
            >
              <Upload size={20} className="mr-2" weight="bold" />
              {isImporting ? 'Importing...' : 'Import Data'}
            </Button>
            
            <p className="text-xs text-muted-foreground px-1">
              Export your data as JSON for backup or import previously exported data
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <h4 className="font-medium mb-4">Data Management</h4>
          
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={async () => {
                const conversations = await spark.kv.get<unknown[]>('conversations')
                if (!conversations || conversations.length === 0) {
                  toast.info('No conversations to clear')
                  return
                }
                
                if (confirm('Clear all conversations?')) {
                  await spark.kv.set('conversations', [])
                  await spark.kv.set('messages', [])
                  toast.success('Conversations cleared')
                  window.location.reload()
                }
              }}
            >
              <Trash size={20} className="mr-2" />
              Clear Conversations
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={async () => {
                const agents = await spark.kv.get<unknown[]>('agents')
                if (!agents || agents.length === 0) {
                  toast.info('No agents to clear')
                  return
                }
                
                if (confirm('Clear all agents?')) {
                  await spark.kv.set('agents', [])
                  await spark.kv.set('agent-runs', [])
                  toast.success('Agents cleared')
                  window.location.reload()
                }
              }}
            >
              <Trash size={20} className="mr-2" />
              Clear Agents
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={async () => {
                const analytics = await spark.kv.get<unknown[]>('analytics-events')
                if (!analytics || analytics.length === 0) {
                  toast.info('No analytics to clear')
                  return
                }
                
                if (confirm('Clear analytics data?')) {
                  await spark.kv.set('analytics-events', [])
                  toast.success('Analytics cleared')
                }
              }}
            >
              <Trash size={20} className="mr-2" />
              Clear Analytics
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-destructive/50 bg-destructive/5">
        <div>
          <h4 className="font-medium mb-3 text-destructive">Danger Zone</h4>
          
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Permanently delete all your data. This action cannot be undone.
            </p>
            
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleClearAllData}
              disabled={isClearing}
            >
              <Trash size={20} className="mr-2" weight="bold" />
              {isClearing ? 'Clearing...' : 'Clear All Data'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
