

import React, { useState, useEffect } from 'react';
import { Activity, Clock, Check, X } from 'lucide-react';
import { Command } from 'cmdk';
import { Progress } from "shared/components/progress";
import { ProviderComponentProps } from '@/entities/model/model/types';

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

  const removeTask = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

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

  const filteredTasks = tasks.filter(task => 
    task.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: BackgroundTask['status']) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-500" />;
      case 'in-progress':
        return <Activity size={16} className="text-blue-500" />;
      case 'completed':
        return <Check size={16} className="text-green-500" />;
      case 'failed':
        return <X size={16} className="text-destructive" />;
    }
  };

  const getStatusColor = (status: BackgroundTask['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500';
      case 'in-progress':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-destructive';
    }
  };

  return (
    <Command.List>
      <Command.Group heading="Background Tasks">
        {filteredTasks.length === 0 ? (
          <Command.Empty>No background tasks found</Command.Empty>
        ) : (
          filteredTasks.map(task => (
            <Command.Item
              key={task.id}
              value={task.description}
              onSelect={() => onSelect?.({...task, closeOnSelect: true})}
            >
              {getStatusIcon(task.status)}
              <div>
                {task.description}
                <span className="cmdk-meta">
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  {task.progress !== undefined && ` • ${task.progress}%`}
                </span>
                {task.progress !== undefined && (
                  <div className="mt-1">
                    <Progress value={task.progress} className="h-1" />
                  </div>
                )}
              </div>
            </Command.Item>
          ))
        )}
      </Command.Group>
    </Command.List>
  );
}
