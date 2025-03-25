import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { BaseTab } from '@/components/ui/base-tab';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export interface BackgroundTasksTabProps {
  onClick?: () => void;
}

export function BackgroundTasksTab({ onClick }: BackgroundTasksTabProps) {
  const handleTaskAction = async (taskId: string, action: 'cancel' | 'retry') => {
    try {
      toast({
        title: 'Success',
        description: `Task ${action === 'cancel' ? 'cancelled' : 'retried'}`,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${action} task`,
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
          <BaseTab
            icon={<Loader2 className="w-3 h-3 animate-spin" />}
            label="Background Tasks"
            shortcut="B"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="center" className="w-[280px] max-h-[400px] mb-1.5 overflow-y-auto">
          <DropdownMenuLabel>Background Tasks</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tasks.length === 0 ? (
            <DropdownMenuItem disabled textValue="No active background tasks">
              <div className="py-3 px-2 text-sm text-center text-muted-foreground">
                No active background tasks
              </div>
            </DropdownMenuItem>
          ) : (
            tasks.map((task) => (
              <DropdownMenuItem
                key={task.id}
                className="flex items-start gap-2 px-2 py-2 cursor-default"
                textValue={task.name}
                onSelect={() => {}}
              >
                <div className="flex items-start gap-2 w-full">
                  <div className="mt-0.5">
                    {task.status === 'running' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {task.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {task.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">{task.name}</span>
                    <div className="flex justify-between items-center mt-1">
                      <div className="w-full max-w-[120px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            task.status === 'failed' ? 'bg-red-500' : 
                            task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">{task.progress}%</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        Started {new Date(task.startTime).toLocaleTimeString()}
                      </span>
                      {task.status === 'running' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-5 px-1 text-xs"
                          onClick={() => handleTaskAction(task.id, 'cancel')}
                        >
                          Cancel
                        </Button>
                      )}
                      {task.status === 'failed' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-5 px-1 text-xs"
                          onClick={() => handleTaskAction(task.id, 'retry')}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
} 