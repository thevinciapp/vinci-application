import { useState } from 'react';
import { Loader2, CheckCircle, XCircle, FolderOpen, Clock, ArrowRight, Search } from 'lucide-react';
import { BaseTab } from 'shared/components/base-tab';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from 'shared/components/dropdown-menu';
import { Button } from 'shared/components/button';
import { toast } from 'shared/hooks/use-toast';
import { DropdownList, DropdownSection, DropdownItem, DropdownFooterAction } from 'shared/components/shared/dropdown-list';

export interface TasksTabProps {
  onClick?: () => void;
}

export function TasksTab({ onClick }: TasksTabProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'completed' | 'failed'>('all');
  
  const handleTaskAction = async (taskId: string, action: 'cancel' | 'retry') => {
    try {
      // Find the task
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      switch (action) {
        case 'cancel':
          toast({
            title: 'Task Cancelled',
            description: `"${task.name}" cancelled successfully`,
            variant: 'default',
          });
          break;
        case 'retry':
          toast({
            title: 'Task Retried',
            description: `"${task.name}" retried successfully`,
            variant: 'default',
          });
          break;
      }
    } catch (error) {
      toast({
        title: 'Operation Failed',
        description: `Failed to ${action} task. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  const tasks = [
    {
      id: 'task-1',
      name: 'Code Generation',
      status: 'running',
      progress: 45,
      startTime: new Date(Date.now() - 300000).toISOString()
    },
    {
      id: 'task-2',
      name: 'File Indexing',
      status: 'completed',
      progress: 100,
      startTime: new Date(Date.now() - 600000).toISOString()
    },
    {
      id: 'task-3',
      name: 'Model Download',
      status: 'failed',
      progress: 30,
      startTime: new Date(Date.now() - 900000).toISOString()
    }
  ];
  
  // Filter tasks based on search query and status filter
  const filterTasks = () => {
    let filtered = [...tasks];
    
    // Apply text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(query) ||
        task.status.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }
    
    return filtered;
  };
  
  const filteredTasks = filterTasks();
  
  // Group tasks by status
  const runningTasks = filteredTasks.filter(task => task.status === 'running');
  const completedTasks = filteredTasks.filter(task => task.status === 'completed');
  const failedTasks = filteredTasks.filter(task => task.status === 'failed');
  
  // Build sections for dropdown
  const taskSections: DropdownSection[] = [];
  
  if (runningTasks.length > 0) {
    taskSections.push({
      title: `Running Tasks (${runningTasks.length})`,
      items: runningTasks.map((task): DropdownItem => ({
        id: task.id,
        onSelect: () => {}, // No need to track selection, handled by footer actions
        content: (
          <div className="flex w-full">
            <div className="flex-shrink-0 mr-2.5 mt-0.5">
              <Loader2 className="w-4 h-4 animate-spin text-white/60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-white/90 truncate">{task.name}</span>
                <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">
                  Running
                </span>
              </div>
              <div className="flex justify-between items-center mt-1.5">
                <div className="w-full max-w-[140px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-xs text-white/60 ml-2">{task.progress}%</span>
              </div>
              <div className="flex mt-1.5">
                <span className="text-xs text-white/50">
                  <Clock className="w-3 h-3 inline mr-1 align-text-bottom" />
                  Started {new Date(task.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          </div>
        )
      }))
    });
  }
  
  if (completedTasks.length > 0) {
    taskSections.push({
      title: `Completed Tasks (${completedTasks.length})`,
      items: completedTasks.map((task): DropdownItem => ({
        id: task.id,
        onSelect: () => {}, // No need to track selection, handled by footer actions
        content: (
          <div className="flex w-full">
            <div className="flex-shrink-0 mr-2.5 mt-0.5">
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-white/90 truncate">{task.name}</span>
                <span className="text-xs bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full">
                  Completed
                </span>
              </div>
              <div className="flex justify-between items-center mt-1.5">
                <div className="w-full max-w-[140px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-green-500"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-xs text-white/60 ml-2">{task.progress}%</span>
              </div>
              <div className="flex mt-1.5">
                <span className="text-xs text-white/50">
                  <Clock className="w-3 h-3 inline mr-1 align-text-bottom" />
                  Finished {new Date(task.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          </div>
        )
      }))
    });
  }
  
  if (failedTasks.length > 0) {
    taskSections.push({
      title: `Failed Tasks (${failedTasks.length})`,
      items: failedTasks.map((task): DropdownItem => ({
        id: task.id,
        onSelect: () => {}, // No need to track selection, handled by footer actions
        content: (
          <div className="flex w-full">
            <div className="flex-shrink-0 mr-2.5 mt-0.5">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-white/90 truncate">{task.name}</span>
                <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full">
                  Failed
                </span>
              </div>
              <div className="flex justify-between items-center mt-1.5">
                <div className="w-full max-w-[140px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-red-500"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-xs text-white/60 ml-2">{task.progress}%</span>
              </div>
              <div className="flex mt-1.5">
                <span className="text-xs text-white/50">
                  <Clock className="w-3 h-3 inline mr-1 align-text-bottom" />
                  Failed at {new Date(task.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          </div>
        )
      }))
    });
  }

  // Define footer actions based on task status
  const getFooterActions = (): DropdownFooterAction[] => {
    return [
      {
        icon: <XCircle className="w-3.5 h-3.5" />,
        label: "Cancel task",
        onClick: (taskId: string) => {
          handleTaskAction(taskId, 'cancel');
        },
        variant: 'destructive',
        shouldShow: (taskId: string) => {
          const task = tasks.find(t => t.id === taskId);
          return task?.status === 'running';
        }
      },
      {
        icon: <ArrowRight className="w-3.5 h-3.5" />,
        label: "Retry task",
        onClick: (taskId: string) => {
          handleTaskAction(taskId, 'retry');
        },
        shouldShow: (taskId: string) => {
          const task = tasks.find(t => t.id === taskId);
          return task?.status === 'failed';
        }
      }
    ];
  };
  
  // Calculate filter summary for display
  const getFilterSummary = () => {
    if (filterStatus === 'all' && !searchQuery) return null;
    
    const parts = [];
    if (filterStatus !== 'all') {
      parts.push(filterStatus === 'running' ? 'Running tasks' : 
                filterStatus === 'completed' ? 'Completed tasks' : 'Failed tasks');
    }
    
    if (searchQuery) {
      parts.push(`"${searchQuery}"`);
    }
    
    return parts.join(' with ');
  };
  
  const filterSummary = getFilterSummary();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="p-0 h-auto hover:bg-white/[0.05] rounded-sm transition-all duration-200 group w-full"
          aria-label="Tasks menu"
        >
          <BaseTab
            icon={
              <div className="flex items-center justify-center w-5 h-5 group-hover:scale-110 transition-transform duration-300">
                <Loader2 className={`w-3 h-3 ${runningTasks.length > 0 ? 'animate-spin text-blue-400' : 'text-white/60'}`} />
              </div>
            }
            label="Tasks"
            shortcut="T"
            className="w-full"
          />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownList 
        headerContent={
          <div className="px-2 pt-1.5 pb-2">
            {/* Search input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-white/40" />
              </div>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.05] rounded-md py-1.5 pl-8 pr-3 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-white/[0.07]"
                aria-label="Search tasks"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2 flex items-center text-white/40 hover:text-white/60"
                >
                  <span className="sr-only">Clear search</span>
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            
            {/* Filters */}
            <div className="mt-2.5 flex space-x-1.5">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 flex-1 justify-center transition-all ${
                  filterStatus === 'all' 
                    ? 'bg-white/10 text-white/90' 
                    : 'bg-white/[0.03] hover:bg-white/[0.05] text-white/60'
                }`}
              >
                <Loader2 className="w-2.5 h-2.5" />
                All
              </button>
              <button
                onClick={() => setFilterStatus('running')}
                className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 flex-1 justify-center transition-all ${
                  filterStatus === 'running' 
                    ? 'bg-white/10 text-white/90' 
                    : 'bg-white/[0.03] hover:bg-white/[0.05] text-white/60'
                }`}
              >
                <Loader2 className="w-2.5 h-2.5 text-blue-400" />
                Running
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 flex-1 justify-center transition-all ${
                  filterStatus === 'completed' 
                    ? 'bg-white/10 text-white/90' 
                    : 'bg-white/[0.03] hover:bg-white/[0.05] text-white/60'
                }`}
              >
                <CheckCircle className="w-2.5 h-2.5 text-green-400" />
                Done
              </button>
              <button
                onClick={() => setFilterStatus('failed')}
                className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 flex-1 justify-center transition-all ${
                  filterStatus === 'failed' 
                    ? 'bg-white/10 text-white/90' 
                    : 'bg-white/[0.03] hover:bg-white/[0.05] text-white/60'
                }`}
              >
                <XCircle className="w-2.5 h-2.5 text-red-400" />
                Failed
              </button>
            </div>
            
            {/* Filter summary */}
            {(filterStatus !== 'all' || searchQuery) && (
              <div className="flex justify-between items-center text-xs text-white/50 mt-2 px-1">
                {filterSummary && (
                  <div className="flex items-center">
                    <Search className="w-3 h-3 mr-1" />
                    <span>Filtering: {filterSummary}</span>
                  </div>
                )}
                <span className="ml-auto">
                  {filteredTasks.length === 0 
                    ? 'No matches' 
                    : `${filteredTasks.length} match${filteredTasks.length === 1 ? '' : 'es'}`}
                </span>
              </div>
            )}
          </div>
        }
        sections={taskSections}
        footerActions={getFooterActions()}
        emptyState={
          <div className="text-sm text-white/50 flex flex-col items-center py-4">
            {searchQuery || filterStatus !== 'all' ? (
              <>
                <Search className="w-8 h-8 text-white/20 mb-2" />
                <p>No tasks match your filters</p>
                <div className="flex space-x-2 mt-4">
                  {searchQuery && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs" 
                      onClick={() => setSearchQuery('')}
                    >
                      Clear search
                    </Button>
                  )}
                  {filterStatus !== 'all' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs" 
                      onClick={() => setFilterStatus('all')}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="w-8 h-8 text-white/20 mb-2" />
                <p>No active tasks</p>
              </>
            )}
          </div>
        }
      />
    </DropdownMenu>
  );
} 