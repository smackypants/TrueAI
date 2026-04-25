import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { AgentTool } from '@/lib/types'
import { Robot, ChartLine, Code, Article, Translate, Brain, MagnifyingGlass, Image } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

export interface AgentTemplate {
  id: string
  name: string
  description: string
  goal: string
  icon: React.ReactNode
  tools: AgentTool[]
  category: 'productivity' | 'analysis' | 'development' | 'content' | 'automation'
  color: string
  systemPrompt?: string
  maxIterations?: number
}

const templates: AgentTemplate[] = [
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'Comprehensive research and analysis with web search and summarization',
    goal: 'Research topics thoroughly, gather information from multiple sources, analyze data, and provide detailed summaries',
    icon: <MagnifyingGlass size={24} weight="fill" />,
    tools: ['web_search', 'summarizer', 'data_analyzer', 'memory', 'validator'],
    category: 'productivity',
    color: 'from-blue-500 to-cyan-500',
    systemPrompt: 'You are a thorough research assistant. Gather information from multiple sources, validate findings, and provide comprehensive summaries.',
    maxIterations: 10
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Process and analyze data with visualization and insights',
    goal: 'Analyze datasets, identify patterns, generate insights, and create visualizations',
    icon: <ChartLine size={24} weight="fill" />,
    tools: ['data_analyzer', 'calculator', 'json_parser', 'file_reader', 'summarizer'],
    category: 'analysis',
    color: 'from-green-500 to-emerald-500',
    systemPrompt: 'You are a data analyst. Process data methodically, identify patterns, and provide actionable insights.',
    maxIterations: 8
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Review code for quality, bugs, and best practices',
    goal: 'Analyze code for potential issues, suggest improvements, and ensure adherence to best practices',
    icon: <Code size={24} weight="fill" />,
    tools: ['code_interpreter', 'file_reader', 'validator', 'summarizer'],
    category: 'development',
    color: 'from-purple-500 to-pink-500',
    systemPrompt: 'You are an expert code reviewer. Identify bugs, security issues, and opportunities for improvement.',
    maxIterations: 6
  },
  {
    id: 'content-creator',
    name: 'Content Creator',
    description: 'Generate creative content with images and text',
    goal: 'Create engaging content including text, summaries, and visual elements',
    icon: <Article size={24} weight="fill" />,
    tools: ['summarizer', 'image_generator', 'translator', 'web_search', 'sentiment_analyzer'],
    category: 'content',
    color: 'from-orange-500 to-red-500',
    systemPrompt: 'You are a creative content generator. Produce engaging, well-structured content that resonates with the audience.',
    maxIterations: 7
  },
  {
    id: 'translator',
    name: 'Multi-Language Translator',
    description: 'Translate content between languages with context awareness',
    goal: 'Translate content accurately while preserving meaning and cultural context',
    icon: <Translate size={24} weight="fill" />,
    tools: ['translator', 'validator', 'memory', 'summarizer'],
    category: 'content',
    color: 'from-indigo-500 to-purple-500',
    systemPrompt: 'You are a professional translator. Maintain accuracy, context, and cultural nuances in translations.',
    maxIterations: 5
  },
  {
    id: 'sentiment-analyzer',
    name: 'Sentiment Analyzer',
    description: 'Analyze emotional tone and sentiment in text',
    goal: 'Evaluate sentiment, emotional tone, and underlying themes in content',
    icon: <Brain size={24} weight="fill" />,
    tools: ['sentiment_analyzer', 'data_analyzer', 'summarizer', 'validator'],
    category: 'analysis',
    color: 'from-pink-500 to-rose-500',
    systemPrompt: 'You are a sentiment analysis expert. Identify emotional patterns, tone, and underlying themes.',
    maxIterations: 5
  },
  {
    id: 'api-orchestrator',
    name: 'API Orchestrator',
    description: 'Coordinate multiple API calls and process responses',
    goal: 'Make API requests, parse responses, and coordinate multiple data sources',
    icon: <Image size={24} weight="fill" />,
    tools: ['api_caller', 'json_parser', 'validator', 'data_analyzer', 'memory'],
    category: 'automation',
    color: 'from-teal-500 to-cyan-500',
    systemPrompt: 'You are an API integration expert. Coordinate API calls efficiently and handle responses reliably.',
    maxIterations: 8
  },
  {
    id: 'general-assistant',
    name: 'General Assistant',
    description: 'Versatile agent with access to all tools',
    goal: 'Help with a wide variety of tasks using all available tools',
    icon: <Robot size={24} weight="fill" />,
    tools: ['calculator', 'datetime', 'memory', 'web_search', 'code_interpreter', 'file_reader', 'json_parser', 'api_caller', 'data_analyzer', 'summarizer'],
    category: 'productivity',
    color: 'from-gray-500 to-slate-500',
    systemPrompt: 'You are a versatile AI assistant. Adapt to any task and use the most appropriate tools.',
    maxIterations: 12
  }
]

interface AgentTemplatesProps {
  onSelectTemplate: (template: AgentTemplate) => void
}

const categoryColors: Record<string, string> = {
  productivity: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  analysis: 'bg-green-500/10 text-green-500 border-green-500/30',
  development: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  content: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  automation: 'bg-teal-500/10 text-teal-500 border-teal-500/30'
}

export function AgentTemplates({ onSelectTemplate }: AgentTemplatesProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Agent Templates</h3>
        <p className="text-sm text-muted-foreground">Start with a pre-configured agent template</p>
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/50 cursor-pointer h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-start gap-3 mb-2">
                    <motion.div 
                      className={`h-12 w-12 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center text-white shrink-0`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                      {template.icon}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{template.name}</CardTitle>
                      <Badge variant="outline" className={`mt-1 ${categoryColors[template.category]}`}>
                        {template.category}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-sm line-clamp-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-2">Tools included:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.tools.slice(0, 4).map(tool => (
                        <Badge key={tool} variant="secondary" className="text-xs">
                          {tool.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                      {template.tools.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.tools.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button 
                    className="w-full"
                    onClick={() => onSelectTemplate(template)}
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export default AgentTemplates
