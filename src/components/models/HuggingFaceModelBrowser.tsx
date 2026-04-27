import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Download, MagnifyingGlass, TrendUp, Spinner, CheckCircle, WarningCircle } from '@phosphor-icons/react'
import type { HuggingFaceModel } from '@/lib/types'
import { motion } from 'framer-motion'
import { searchHuggingFaceModels, downloadModel, formatBytes, getPopularGGUFModels } from '@/lib/huggingface'
import { toast } from 'sonner'

interface HuggingFaceModelBrowserProps {
  onDownload: (model: HuggingFaceModel) => void
}

interface DownloadProgress {
  modelId: string
  progress: number
  downloaded: number
  total: number
  status: 'downloading' | 'completed' | 'error'
  error?: string
}

export function HuggingFaceModelBrowser({ onDownload }: HuggingFaceModelBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [models, setModels] = useState<HuggingFaceModel[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [downloads, setDownloads] = useState<Map<string, DownloadProgress>>(new Map())
  const [hasSearched, setHasSearched] = useState(false)

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  useEffect(() => {
    const popularModels = getPopularGGUFModels()
    if (popularModels.length > 0 && !hasSearched) {
      performSearch(popularModels[0])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const performSearch = async (query?: string) => {
    const searchTerm = query || searchQuery
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term')
      return
    }

    setIsSearching(true)
    setSearchError(null)
    setHasSearched(true)

    try {
      const results = await searchHuggingFaceModels(searchTerm, 20)
      setModels(results)
      
      if (results.length === 0) {
        toast.info('No GGUF models found. Try a different search term.')
      } else {
        toast.success(`Found ${results.length} models`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search models'
      setSearchError(errorMessage)
      toast.error(errorMessage)
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleDownloadModel = async (model: HuggingFaceModel) => {
    if (downloads.has(model.id)) {
      toast.info('Download already in progress')
      return
    }

    setDownloads(prev => new Map(prev).set(model.id, {
      modelId: model.id,
      progress: 0,
      downloaded: 0,
      total: 0,
      status: 'downloading'
    }))

    try {
      toast.info(`Starting download: ${model.name}`)
      
      const blob = await downloadModel(
        model.downloadUrl,
        (progress, downloaded, total) => {
          setDownloads(prev => {
            const newMap = new Map(prev)
            newMap.set(model.id, {
              modelId: model.id,
              progress,
              downloaded,
              total,
              status: 'downloading'
            })
            return newMap
          })
        }
      )

      setDownloads(prev => {
        const newMap = new Map(prev)
        newMap.set(model.id, {
          modelId: model.id,
          progress: 100,
          downloaded: blob.size,
          total: blob.size,
          status: 'completed'
        })
        return newMap
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = model.downloadUrl.split('/').pop() || `${model.name}.gguf`
      link.click()
      URL.revokeObjectURL(url)

      toast.success(`Downloaded: ${model.name}`)
      onDownload(model)

      setTimeout(() => {
        setDownloads(prev => {
          const newMap = new Map(prev)
          newMap.delete(model.id)
          return newMap
        })
      }, 3000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed'
      
      setDownloads(prev => {
        const newMap = new Map(prev)
        newMap.set(model.id, {
          modelId: model.id,
          progress: 0,
          downloaded: 0,
          total: 0,
          status: 'error',
          error: errorMessage
        })
        return newMap
      })

      toast.error(`Download failed: ${errorMessage}`)
      console.error('Download error:', error)

      setTimeout(() => {
        setDownloads(prev => {
          const newMap = new Map(prev)
          newMap.delete(model.id)
          return newMap
        })
      }, 5000)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      performSearch()
    }
  }

  return (
    <Card className="p-3 sm:p-6">
      <CardHeader className="px-0 pt-0 pb-3 sm:pb-6">
        <CardTitle className="text-lg sm:text-2xl">HuggingFace Model Browser</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Search and download GGUF models from HuggingFace</CardDescription>
      </CardHeader>

      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              id="hf-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search models..."
              className="pl-9 h-10 text-sm"
              disabled={isSearching}
            />
          </div>
          <Button onClick={() => performSearch()} disabled={isSearching || !searchQuery.trim()} className="h-10 sm:min-w-[100px]">
            {isSearching ? (
              <><Spinner className="animate-spin" size={18} /><span className="ml-2 hidden sm:inline">Searching...</span></>
            ) : (
              <>Search</>
            )}
          </Button>
        </div>

        {searchError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 sm:p-3 flex items-start gap-2">
            <WarningCircle size={18} className="text-destructive mt-0.5 flex-shrink-0 sm:w-5 sm:h-5" />
            <p className="text-xs sm:text-sm text-destructive">{searchError}</p>
          </div>
        )}

        <ScrollArea className="h-[400px] sm:h-[500px] pr-2 sm:pr-4">
          <div className="space-y-2 sm:space-y-3">
            {isSearching && models.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
                <Spinner className="animate-spin mb-3 sm:mb-4" size={28} />
                <p className="text-muted-foreground text-sm sm:text-base">Searching models...</p>
              </div>
            )}

            {!isSearching && models.length === 0 && hasSearched && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
                <p className="text-muted-foreground mb-2 text-sm sm:text-base">No models found</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Try: Llama, Mistral, or Phi-3</p>
              </div>
            )}

            {!hasSearched && models.length === 0 && !isSearching && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
                <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">Search for GGUF models</p>
                <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                  {getPopularGGUFModels().slice(0, 4).map(modelName => (
                    <Button
                      key={modelName}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs sm:text-sm"
                      onClick={() => {
                        setSearchQuery(modelName.split('/')[1].replace('-GGUF', ''))
                        performSearch(modelName)
                      }}
                    >
                      {modelName.split('/')[1].replace('-GGUF', '')}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {filteredModels.map((model, index) => {
              const downloadProgress = downloads.get(model.id)
              const isDownloading = downloadProgress?.status === 'downloading'
              const isCompleted = downloadProgress?.status === 'completed'
              const hasError = downloadProgress?.status === 'error'

              return (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-3 sm:p-4 hover:border-accent/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm sm:text-base">{model.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {model.quantization}
                          </Badge>
                        </div>
                        
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          by {model.author}
                        </p>
                        
                        {model.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            {model.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-1">
                          {model.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground font-mono">
                          <span>{model.size.toFixed(1)}GB</span>
                          <span>{model.contextLength}ctx</span>
                          <span className="flex items-center gap-1">
                            <TrendUp size={12} />
                            {(model.downloads / 1000).toFixed(0)}k
                          </span>
                        </div>

                        {downloadProgress && (
                          <div className="space-y-1">
                            <Progress value={downloadProgress.progress} className="h-1.5 sm:h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span className="truncate">
                                {isDownloading && 'Downloading...'}
                                {isCompleted && 'Complete!'}
                                {hasError && 'Error'}
                              </span>
                              {downloadProgress.total > 0 && (
                                <span className="text-xs">
                                  {formatBytes(downloadProgress.downloaded)} / {formatBytes(downloadProgress.total)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        onClick={() => handleDownloadModel(model)} 
                        size="sm"
                        disabled={isDownloading || isCompleted}
                        variant={isCompleted ? 'secondary' : hasError ? 'destructive' : 'default'}
                        className="w-full sm:w-auto h-9 shrink-0"
                      >
                        {isDownloading && <Spinner className="animate-spin sm:mr-2" size={16} />}
                        {isCompleted && <CheckCircle weight="fill" size={16} className="sm:mr-2" />}
                        {hasError && <WarningCircle weight="fill" size={16} className="sm:mr-2" />}
                        {!isDownloading && !isCompleted && !hasError && <Download weight="bold" size={16} className="sm:mr-2" />}
                        <span className="hidden sm:inline">{isDownloading ? 'Downloading' : isCompleted ? 'Downloaded' : hasError ? 'Failed' : 'Download'}</span>
                        <span className="sm:hidden ml-2">{isDownloading ? 'Downloading' : isCompleted ? 'Done' : hasError ? 'Failed' : 'Download'}</span>
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </Card>
  )
}

export default HuggingFaceModelBrowser
