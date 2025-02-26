'use client';

import { useEffect, useState, useRef, memo } from 'react';
import { JSONValue } from 'ai';
import { cn } from '@/lib/utils';

interface StreamStatusProps {
  streamData?: JSONValue[] | undefined;
}

// Extract the latest status from stream data
function getLatestStatus(streamData?: JSONValue[]): string {
  if (!streamData || !Array.isArray(streamData) || streamData.length === 0) {
    return 'Processing...';
  }
  
  const lastItem = streamData[streamData.length - 1];
  
  // Handle case when we pass a status object directly
  if (typeof lastItem === 'object' && lastItem !== null && 'status' in lastItem) {
    return String(lastItem.status);
  }
  
  return String(lastItem);
}

export const StreamStatus = memo(({ streamData }: StreamStatusProps) => {
  const [statusHistory, setStatusHistory] = useState<string[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>('Processing...');
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialProcessingShownRef = useRef<boolean>(false);
  const lastProcessedDataLengthRef = useRef<number>(0);
  
  useEffect(() => {
    // Bail out early if no new data
    if (!streamData || !Array.isArray(streamData) || 
        streamData.length === 0 || 
        streamData.length === lastProcessedDataLengthRef.current) {
      return;
    }
    
    // Update our reference to avoid processing the same data multiple times
    lastProcessedDataLengthRef.current = streamData.length;
    
    const newStatus = getLatestStatus(streamData);
    const currentTime = Date.now();
    
    // Only update if the status has changed to avoid unnecessary renders
    if (newStatus !== currentStatus) {
      // Clear any existing transition timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      // Ensure minimum transition time of 600ms between status changes
      const timeSinceLastUpdate = currentTime - lastUpdateTimeRef.current;
      const transitionDelay = Math.max(0, 600 - timeSinceLastUpdate);
      
      transitionTimeoutRef.current = setTimeout(() => {
        // First, add the current status to history (including the initial "Processing...")
        setStatusHistory(prev => {
          // Only add "Processing..." to history once when the first real status arrives
          if (currentStatus === 'Processing...' && !initialProcessingShownRef.current) {
            initialProcessingShownRef.current = true;
            return [currentStatus, ...prev].slice(0, 3); // Keep last 3 statuses
          }
          return [currentStatus, ...prev].slice(0, 3); // Keep last 3 statuses
        });
        
        // Then, update current status to the new status
        setCurrentStatus(newStatus);
        lastUpdateTimeRef.current = Date.now();
      }, transitionDelay);
    }
  }, [streamData, currentStatus]);
  
  return (
    <div className="group rounded-lg backdrop-blur-sm border border-white/[0.05] overflow-hidden transform-gpu transition-all duration-300 ease-out hover:border-white/[0.1]">
      {/* Main status container styled like a tab */}
      <div className="px-3 py-2 relative overflow-hidden bg-white/[0.025] hover:bg-white/[0.035] transition-all duration-300">
        <div className="flex items-center gap-3 relative z-10">
          {/* Status indicator with pulse animation */}
          <div className="relative w-3.5 h-3.5 flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-pulse-slow" />
            <div className="absolute inset-0.5 rounded-full bg-cyan-400 group-hover:bg-[#3ecfff] transition-colors duration-300 animate-pulse-fast" />
          </div>
          
          {/* Current status with tab-like styling */}
          <div className="font-medium text-xs text-white/75 w-full group-hover:text-white/95 transition-colors duration-300">
            {currentStatus}
          </div>
        </div>
      </div>

      {/* Status history with improved transitions in a tab-like container */}
      {statusHistory.length > 0 && (
        <div className="bg-white/[0.015] px-3 py-1.5 space-y-1.5 border-t border-white/[0.025]">
          {statusHistory.map((status, index) => (
            <div 
              key={`status-${index}-${status}`}
              className="text-[10px] text-white/60 transition-all duration-500 flex items-center group-hover:text-white/70"
              style={{ 
                opacity: Math.max(0.7 - index * 0.2, 0.3),
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white/30 mr-2 group-hover:bg-white/40 transition-colors duration-300" />
              {status}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if streamData has changed in a meaningful way
  if (!prevProps.streamData && !nextProps.streamData) return true;
  if (!prevProps.streamData || !nextProps.streamData) return false;
  
  const prevLength = prevProps.streamData.length;
  const nextLength = nextProps.streamData.length;
  
  // If the lengths are the same, don't re-render
  if (prevLength === nextLength) return true;
  
  // If we have a lot of updates, only re-render every 5 updates
  // to avoid excessive re-renders during fast streaming
  if (prevLength > 10 && nextLength > prevLength && (nextLength - prevLength) < 5) {
    return true;
  }
  
  return false;
});

StreamStatus.displayName = 'StreamStatus';