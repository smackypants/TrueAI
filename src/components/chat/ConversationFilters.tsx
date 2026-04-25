import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Faders } from '@phosphor-icons/react'

export type ConversationSortOption = 
  | 'recent' 
  | 'oldest' 
  | 'alphabetical' 
  | 'messages'

export type ConversationFilterOption = 
  | 'all' 
  | 'pinned' 
  | 'archived' 
  | 'today' 
  | 'week' 
  | 'month'

interface ConversationFiltersProps {
  sortBy: ConversationSortOption
  filterBy: ConversationFilterOption
  onSortChange: (sort: ConversationSortOption) => void
  onFilterChange: (filter: ConversationFilterOption) => void
}

export function ConversationFilters({
  sortBy,
  filterBy,
  onSortChange,
  onFilterChange
}: ConversationFiltersProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Faders weight="bold" size={16} />
          Filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Sort By</h4>
            <RadioGroup value={sortBy} onValueChange={(value) => onSortChange(value as ConversationSortOption)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recent" id="sort-recent" />
                <Label htmlFor="sort-recent" className="cursor-pointer">Most Recent</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="oldest" id="sort-oldest" />
                <Label htmlFor="sort-oldest" className="cursor-pointer">Oldest First</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="alphabetical" id="sort-alpha" />
                <Label htmlFor="sort-alpha" className="cursor-pointer">Alphabetical</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="messages" id="sort-messages" />
                <Label htmlFor="sort-messages" className="cursor-pointer">Message Count</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Filter</h4>
            <RadioGroup value={filterBy} onValueChange={(value) => onFilterChange(value as ConversationFilterOption)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="filter-all" />
                <Label htmlFor="filter-all" className="cursor-pointer">All Conversations</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pinned" id="filter-pinned" />
                <Label htmlFor="filter-pinned" className="cursor-pointer">Pinned Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="archived" id="filter-archived" />
                <Label htmlFor="filter-archived" className="cursor-pointer">Archived</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="today" id="filter-today" />
                <Label htmlFor="filter-today" className="cursor-pointer">Today</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="week" id="filter-week" />
                <Label htmlFor="filter-week" className="cursor-pointer">This Week</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="month" id="filter-month" />
                <Label htmlFor="filter-month" className="cursor-pointer">This Month</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
