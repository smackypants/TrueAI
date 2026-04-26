import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MagnifyingGlass,
  Download,
  ChartLine,
  FileText,
  Code,
  EnvelopeSimple,
  Briefcase,
  Database
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import type { WorkflowTemplate } from '@/lib/workflow-types'

const templateLibrary: WorkflowTemplate[] = [
  {
    id: 'template-1',
    name: 'Content Research & Writing',
    description: 'Research a topic, analyze findings, and generate a comprehensive article with citations',
    category: 'content_creation',
    workflow: {
      id: 'wf-1',
      name: 'Content Research & Writing',
      description: '',
      nodes: [
        { id: 'start', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
        { id: 'research', type: 'tool', position: { x: 250, y: 150 }, data: { label: 'Web Research', toolName: 'web_search' } },
        { id: 'analyze', type: 'agent', position: { x: 250, y: 250 }, data: { label: 'Analyze Research', config: { goal: 'Analyze research findings' } } },
        { id: 'write', type: 'agent', position: { x: 250, y: 350 }, data: { label: 'Write Article', config: { goal: 'Generate article from analysis' } } },
        { id: 'end', type: 'end', position: { x: 250, y: 450 }, data: { label: 'End' } }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'research' },
        { id: 'e2', source: 'research', target: 'analyze' },
        { id: 'e3', source: 'analyze', target: 'write' },
        { id: 'e4', source: 'write', target: 'end' }
      ],
      variables: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    parameters: [
      { name: 'topic', type: 'string', description: 'Topic to research', required: true },
      { name: 'article_length', type: 'number', description: 'Target word count', required: false, default: 1000 }
    ],
    tags: ['research', 'writing', 'content'],
    rating: 4.8,
    downloads: 1250,
    author: 'TrueAI Team',
    featured: true
  },
  {
    id: 'template-2',
    name: 'Data ETL Pipeline',
    description: 'Extract data from API, transform with validation, load to database with error handling',
    category: 'data_processing',
    workflow: {
      id: 'wf-2',
      name: 'Data ETL Pipeline',
      description: '',
      nodes: [
        { id: 'start', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
        { id: 'extract', type: 'tool', position: { x: 250, y: 150 }, data: { label: 'Extract Data', toolName: 'api_caller' } },
        { id: 'validate', type: 'tool', position: { x: 250, y: 250 }, data: { label: 'Validate Data', toolName: 'validator' } },
        { id: 'transform', type: 'agent', position: { x: 250, y: 350 }, data: { label: 'Transform Data' } },
        { id: 'load', type: 'tool', position: { x: 250, y: 450 }, data: { label: 'Load to DB', toolName: 'api_caller' } },
        { id: 'end', type: 'end', position: { x: 250, y: 550 }, data: { label: 'End' } }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'extract' },
        { id: 'e2', source: 'extract', target: 'validate' },
        { id: 'e3', source: 'validate', target: 'transform' },
        { id: 'e4', source: 'transform', target: 'load' },
        { id: 'e5', source: 'load', target: 'end' }
      ],
      variables: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    parameters: [
      { name: 'source_api', type: 'string', description: 'Source API endpoint', required: true },
      { name: 'target_db', type: 'string', description: 'Target database', required: true }
    ],
    tags: ['etl', 'data', 'pipeline'],
    rating: 4.6,
    downloads: 890,
    author: 'TrueAI Team'
  },
  {
    id: 'template-3',
    name: 'Code Review Automation',
    description: 'Analyze code quality, check best practices, generate improvement suggestions',
    category: 'development',
    workflow: {
      id: 'wf-3',
      name: 'Code Review Automation',
      description: '',
      nodes: [
        { id: 'start', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
        { id: 'read', type: 'tool', position: { x: 250, y: 150 }, data: { label: 'Read Code', toolName: 'file_reader' } },
        { id: 'parallel', type: 'parallel', position: { x: 250, y: 250 }, data: { label: 'Parallel Analysis' } },
        { id: 'quality', type: 'agent', position: { x: 100, y: 350 }, data: { label: 'Quality Check' } },
        { id: 'security', type: 'agent', position: { x: 400, y: 350 }, data: { label: 'Security Scan' } },
        { id: 'merge', type: 'merge', position: { x: 250, y: 450 }, data: { label: 'Merge Results' } },
        { id: 'report', type: 'agent', position: { x: 250, y: 550 }, data: { label: 'Generate Report' } },
        { id: 'end', type: 'end', position: { x: 250, y: 650 }, data: { label: 'End' } }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'read' },
        { id: 'e2', source: 'read', target: 'parallel' },
        { id: 'e3', source: 'parallel', target: 'quality' },
        { id: 'e4', source: 'parallel', target: 'security' },
        { id: 'e5', source: 'quality', target: 'merge' },
        { id: 'e6', source: 'security', target: 'merge' },
        { id: 'e7', source: 'merge', target: 'report' },
        { id: 'e8', source: 'report', target: 'end' }
      ],
      variables: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    parameters: [
      { name: 'file_path', type: 'string', description: 'Path to code file', required: true },
      { name: 'language', type: 'string', description: 'Programming language', required: true }
    ],
    tags: ['code', 'review', 'quality'],
    rating: 4.9,
    downloads: 1450,
    author: 'TrueAI Team',
    featured: true
  },
  {
    id: 'template-4',
    name: 'Market Research Report',
    description: 'Search trends, analyze competitors, generate comprehensive market report',
    category: 'research',
    workflow: {
      id: 'wf-4',
      name: 'Market Research Report',
      description: '',
      nodes: [
        { id: 'start', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
        { id: 'trends', type: 'tool', position: { x: 150, y: 150 }, data: { label: 'Search Trends', toolName: 'web_search' } },
        { id: 'competitors', type: 'tool', position: { x: 350, y: 150 }, data: { label: 'Analyze Competitors', toolName: 'web_search' } },
        { id: 'analyze', type: 'agent', position: { x: 250, y: 250 }, data: { label: 'Data Analysis' } },
        { id: 'report', type: 'agent', position: { x: 250, y: 350 }, data: { label: 'Generate Report' } },
        { id: 'end', type: 'end', position: { x: 250, y: 450 }, data: { label: 'End' } }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'trends' },
        { id: 'e2', source: 'start', target: 'competitors' },
        { id: 'e3', source: 'trends', target: 'analyze' },
        { id: 'e4', source: 'competitors', target: 'analyze' },
        { id: 'e5', source: 'analyze', target: 'report' },
        { id: 'e6', source: 'report', target: 'end' }
      ],
      variables: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    parameters: [
      { name: 'market', type: 'string', description: 'Market to research', required: true },
      { name: 'competitors', type: 'string', description: 'Competitor names', required: false }
    ],
    tags: ['research', 'market', 'business'],
    rating: 4.7,
    downloads: 720,
    author: 'TrueAI Team'
  },
  {
    id: 'template-5',
    name: 'Email Campaign Automation',
    description: 'Generate personalized emails, validate addresses, schedule sends',
    category: 'communication',
    workflow: {
      id: 'wf-5',
      name: 'Email Campaign Automation',
      description: '',
      nodes: [
        { id: 'start', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
        { id: 'generate', type: 'agent', position: { x: 250, y: 150 }, data: { label: 'Generate Emails' } },
        { id: 'validate', type: 'tool', position: { x: 250, y: 250 }, data: { label: 'Validate Addresses', toolName: 'validator' } },
        { id: 'decision', type: 'decision', position: { x: 250, y: 350 }, data: { label: 'Valid?', condition: 'valid === true' } },
        { id: 'send', type: 'tool', position: { x: 150, y: 450 }, data: { label: 'Send Email', toolName: 'api_caller' } },
        { id: 'log', type: 'tool', position: { x: 350, y: 450 }, data: { label: 'Log Error', toolName: 'memory' } },
        { id: 'end', type: 'end', position: { x: 250, y: 550 }, data: { label: 'End' } }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'generate' },
        { id: 'e2', source: 'generate', target: 'validate' },
        { id: 'e3', source: 'validate', target: 'decision' },
        { id: 'e4', source: 'decision', target: 'send', label: 'Yes' },
        { id: 'e5', source: 'decision', target: 'log', label: 'No' },
        { id: 'e6', source: 'send', target: 'end' },
        { id: 'e7', source: 'log', target: 'end' }
      ],
      variables: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    parameters: [
      { name: 'recipients', type: 'string', description: 'Recipient list', required: true },
      { name: 'template', type: 'string', description: 'Email template', required: true }
    ],
    tags: ['email', 'marketing', 'automation'],
    rating: 4.5,
    downloads: 550,
    author: 'TrueAI Team'
  },
  {
    id: 'template-6',
    name: 'Customer Support Triage',
    description: 'Analyze tickets, classify urgency, route to appropriate team',
    category: 'business',
    workflow: {
      id: 'wf-6',
      name: 'Customer Support Triage',
      description: '',
      nodes: [
        { id: 'start', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
        { id: 'analyze', type: 'agent', position: { x: 250, y: 150 }, data: { label: 'Analyze Ticket' } },
        { id: 'sentiment', type: 'tool', position: { x: 250, y: 250 }, data: { label: 'Sentiment Check', toolName: 'sentiment_analyzer' } },
        { id: 'urgency', type: 'decision', position: { x: 250, y: 350 }, data: { label: 'High Urgency?', condition: 'urgency > 7' } },
        { id: 'escalate', type: 'tool', position: { x: 150, y: 450 }, data: { label: 'Escalate', toolName: 'api_caller' } },
        { id: 'standard', type: 'tool', position: { x: 350, y: 450 }, data: { label: 'Standard Queue', toolName: 'api_caller' } },
        { id: 'end', type: 'end', position: { x: 250, y: 550 }, data: { label: 'End' } }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'analyze' },
        { id: 'e2', source: 'analyze', target: 'sentiment' },
        { id: 'e3', source: 'sentiment', target: 'urgency' },
        { id: 'e4', source: 'urgency', target: 'escalate', label: 'Yes' },
        { id: 'e5', source: 'urgency', target: 'standard', label: 'No' },
        { id: 'e6', source: 'escalate', target: 'end' },
        { id: 'e7', source: 'standard', target: 'end' }
      ],
      variables: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    parameters: [
      { name: 'ticket_id', type: 'string', description: 'Ticket ID', required: true }
    ],
    tags: ['support', 'triage', 'customer'],
    rating: 4.8,
    downloads: 980,
    author: 'TrueAI Team',
    featured: true
  }
]

interface WorkflowTemplatesProps {
  onUseTemplate: (template: WorkflowTemplate) => void
}

export function WorkflowTemplates({ onUseTemplate }: WorkflowTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const filteredTemplates = templateLibrary.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'data_processing': return <Database weight="fill" size={20} />
      case 'content_creation': return <FileText weight="fill" size={20} />
      case 'research': return <ChartLine weight="fill" size={20} />
      case 'development': return <Code weight="fill" size={20} />
      case 'communication': return <EnvelopeSimple weight="fill" size={20} />
      case 'business': return <Briefcase weight="fill" size={20} />
      default: return <ChartLine weight="fill" size={20} />
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">Workflow Templates</h2>
        <p className="text-sm text-muted-foreground">
          Pre-built workflows for common use cases - one-click deployment
        </p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="data_processing">Data Processing</SelectItem>
            <SelectItem value="content_creation">Content Creation</SelectItem>
            <SelectItem value="research">Research & Analysis</SelectItem>
            <SelectItem value="development">Development</SelectItem>
            <SelectItem value="communication">Communication</SelectItem>
            <SelectItem value="business">Business</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(template.category)}
                      <h3 className="font-semibold text-base">{template.name}</h3>
                    </div>
                    {template.featured && (
                      <Badge variant="secondary" className="text-xs">
                        Featured
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span>⭐ {template.rating}</span>
                      <span className="flex items-center gap-1">
                        <Download size={14} />
                        {template.downloads}
                      </span>
                    </div>
                    <span>{template.author}</span>
                  </div>

                  <Button
                    onClick={() => onUseTemplate(template)}
                    className="w-full"
                    size="sm"
                  >
                    Use Template
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No templates match your search</p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

export default WorkflowTemplates
