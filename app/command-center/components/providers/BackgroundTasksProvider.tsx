"use client";

import React, { useState, useEffect } from 'react';
import { Activity, Clock, Check, X } from 'lucide-react';
import { toast } from 'sonner';
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

export function BackgroundTasksProvider({ searchQuery, onSelect, onAction }: ProviderComponentProps) {
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

  // Render empty state if no tasks
  if (!filteredTasks.length) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-gray-500">
        <Activity className="h-8 w-8 mb-2 text-gray-400" />
        <p>No background tasks found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {filteredTasks.map(task => (
        <div
          key={task.id}
          className={cn(
            "flex items-center justify-between p-3 rounded-lg",
            "bg-white/[0.03] hover:bg-white/[0.06]",
            "border border-white/[0.05]",
            "transition-all duration-200 ease-in-out",
            "cursor-pointer"
          )}
          onClick={() => onSelect?.(task)}
        >
          <div className="flex items-center gap-3">
            {task.status === 'pending' && <Clock className="h-4 w-4 text-yellow-400" />}
            {task.status === 'in-progress' && <Activity className="h-4 w-4 text-blue-400" />}
            {task.status === 'completed' && <Check className="h-4 w-4 text-green-400" />}
            {task.status === 'failed' && <X className="h-4 w-4 text-red-400" />}
            <span className="text-sm">{task.description}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {task.progress !== undefined && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300" 
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{task.progress}%</span>
              </div>
            )}
            
            <div className={cn(
              'px-1.5 py-0.5 text-xs font-medium rounded',
              task.status === 'pending' && 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
              task.status === 'in-progress' && 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
              task.status === 'completed' && 'bg-green-500/20 text-green-400 border border-green-500/30',
              task.status === 'failed' && 'bg-red-500/20 text-red-400 border border-red-500/30'
            )}>
              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
