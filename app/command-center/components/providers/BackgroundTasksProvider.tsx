"use client";

import React, { useState, useEffect } from 'react';
import { Activity, Clock, Check, X } from 'lucide-react';
import { CommandGroup, CommandItem, CommandList, Progress } from "vinci-ui";
import { cn } from '@/lib/utils';
import { ProviderComponentProps } from '../../types';

interface BackgroundTask {
  id: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  progress?: number;
}

export function BackgroundTasksProvider({ searchQuery, onSelect }: ProviderComponentProps) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);

  // Example function to create a new background task
  const createBackgroundTask = (description: string) => {
    const newTask: BackgroundTask = {
      id: `task-${Date.now()}`,
      description,
      status: 'pending',
      createdAt: Date.now(),
    };
    
    setTasks(prevTasks => [...prevTasks, newTask]);
    return newTask.id;
  };

  // Example function to update a task's status
  const updateTaskStatus = (taskId: string, status: BackgroundTask['status'], progress?: number) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status, 
              progress, 
              ...(status === 'completed' ? { completedAt: Date.now() } : {})
            } 
          : task
      )
    );
  };

  // Example function to remove a task
  const removeTask = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  // Attach methods to window for global access
  useEffect(() => {
    const api = {
      createBackgroundTask,
      updateTaskStatus,
      removeTask
    };
    (window as any).backgroundTasks = api;
    return () => {
      delete (window as any).backgroundTasks;
    };
  }, []);

  // Filter tasks based on search query
  const filteredTasks = tasks.filter(task => 
    task.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <CommandList>
      <CommandGroup heading="Background Tasks">
        {filteredTasks.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">No background tasks found</p>
        ) : (
          filteredTasks.map(task => (
            <CommandItem
              key={task.id}
              value={task.description}
              onSelect={() => onSelect?.({...task, closeOnSelect: true})}
              className="flex flex-col items-start justify-between py-3"
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  {task.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                  {task.status === 'in-progress' && <Activity className="h-4 w-4 text-blue-500" />}
                  {task.status === 'completed' && <Check className="h-4 w-4 text-green-500" />}
                  {task.status === 'failed' && <X className="h-4 w-4 text-destructive" />}
                  <p className="font-medium">{task.description}</p>
                </div>
                
                <div className="flex items-center">
                  <span className={cn(
                    'px-1.5 py-0.5 text-xs font-medium rounded',
                    task.status === 'pending' && 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30',
                    task.status === 'in-progress' && 'bg-blue-500/20 text-blue-500 border border-blue-500/30',
                    task.status === 'completed' && 'bg-green-500/20 text-green-500 border border-green-500/30',
                    task.status === 'failed' && 'bg-destructive/20 text-destructive border border-destructive/30'
                  )}>
                    {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  </span>
                </div>
              </div>
              
              {task.progress !== undefined && (
                <div className="w-full mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Progress</span>
                    <span className="text-xs font-medium">{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} className="h-1.5" />
                </div>
              )}
            </CommandItem>
          ))
        )}
      </CommandGroup>
    </CommandList>
  );
}
