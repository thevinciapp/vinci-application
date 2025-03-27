import { useState } from 'react';
import { Loader2, CheckCircle, XCircle, FolderOpen, Clock, ArrowRight, Search } from 'lucide-react';
import { BaseTab } from '@/components/ui/base-tab';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { DropdownList, DropdownSection, DropdownItem, DropdownFooterAction } from '@/components/shared/dropdown-list';

export interface BackgroundTasksTabProps {
  onClick?: () => void;
}

export function BackgroundTasksTab({ onClick }: BackgroundTasksTabProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const handleTaskAction = async (taskId: string, action: 'cancel' | 'retry') => {
    try {
      // Find the task
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      toast({
        title: action === 'cancel' ? 'Task Cancelled' : 'Task Retried',
        description: `"${task.name}" ${action === 'cancel' ? 'cancelled' : 'retried'} successfully`,
        variant: 'default',
      });
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
  
  // Filter tasks based on search query
  const filterTasks = () => {
    if (!searchQuery.trim()) return tasks;
    
    const query = searchQuery.toLowerCase().trim();
    return tasks.filter(task => 
      task.name.toLowerCase().includes(query) ||
      task.status.toLowerCase().includes(query)
    );
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
        isActive: selectedTaskId === task.id,
        onSelect: () => setSelectedTaskId(task.id),
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
        isActive: selectedTaskId === task.id,
        onSelect: () => setSelectedTaskId(task.id),
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
        isActive: selectedTaskId === task.id,
        onSelect: () => setSelectedTaskId(task.id),
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

  // Define footer actions based on selected task
  const getFooterActions = (): DropdownFooterAction[] => {
    // If a task is selected, show task-specific actions
    if (selectedTaskId) {
      const selectedTask = tasks.find(task => task.id === selectedTaskId);
      if (selectedTask) {
        if (selectedTask.status === 'running') {
          return [
            {
              icon: <XCircle className="w-3.5 h-3.5" />,
              label: "Cancel task",
              onClick: () => handleTaskAction(selectedTaskId, 'cancel'),
              variant: 'destructive'
            }
          ];
        } else if (selectedTask.status === 'failed') {
          return [
            {
              icon: <ArrowRight className="w-3.5 h-3.5" />,
              label: "Retry task",
              onClick: () => handleTaskAction(selectedTaskId, 'retry')
            }
          ];
        } else {
          return [
            {
              icon: <FolderOpen className="w-3.5 h-3.5" />,
              label: "View results",
              onClick: () => {
                toast({
                  title: "Results Opened",
                  description: `Viewing results for "${selectedTask.name}"`,
                  variant: 'default',
                })
              }
            }
          ];
        }
      }
    }
    
    // Default actions when no task is selected
    return [
      {
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        label: "Clear completed",
        onClick: () => {
          toast({
            title: "Tasks Cleared",
            description: "Completed tasks have been cleared",
            variant: 'default',
          });
        }
      },
      {
        icon: <XCircle className="w-3.5 h-3.5" />,
        label: "Cancel all",
        onClick: () => {
          toast({
            title: "All Tasks Cancelled",
            description: "All running tasks have been cancelled",
            variant: 'destructive',
          });
        },
        variant: 'destructive'
      }
    ];
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="p-0 h-auto hover:bg-white/[0.05] rounded-sm transition-all duration-200 group w-full"
          aria-label="Background tasks menu"
        >
          <BaseTab
            icon={
              <div className="flex items-center justify-center w-5 h-5 group-hover:scale-110 transition-transform duration-300">
                <Loader2 className={`w-3 h-3 ${runningTasks.length > 0 ? 'animate-spin text-blue-400' : 'text-white/60'}`} />
              </div>
            }
            label="Background Tasks"
            shortcut="B"
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
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Search feedback */}
            {searchQuery && (
              <div className="flex justify-between items-center text-xs text-white/50 mt-1.5 px-1">
                <span>
                  {filteredTasks.length === 0 
                    ? 'No matches found' 
                    : `Found ${filteredTasks.length} match${filteredTasks.length === 1 ? '' : 'es'}`}
                </span>
                <button 
                  className="hover:text-white/70 transition-colors text-xs"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        }
        sections={taskSections}
        footerActions={getFooterActions()}
        emptyState={
          <div className="text-sm text-white/50 flex flex-col items-center py-4">
            {searchQuery ? (
              <>
                <Search className="w-8 h-8 text-white/20 mb-2" />
                <p>No tasks match your search</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 text-xs" 
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </Button>
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