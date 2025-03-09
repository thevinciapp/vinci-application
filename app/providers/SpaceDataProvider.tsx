'use client';

import React, { useEffect, useState } from 'react';
import { useSpaceStore } from '@/stores/space-store';
import { getSpaces, getActiveSpace } from '@/app/actions';

export function SpaceDataProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { 
    fetchSpaces, 
    setSpaces, 
    activeSpace, 
    setActiveSpace,
    fetchSpaceData
  } = useSpaceStore();

  // Initialize space data on app load
  useEffect(() => {
    const initializeSpaceData = async () => {
      try {
        // Step 1: Load all spaces
        await fetchSpaces();
        
        // Step 2: Get active space if exists
        const activeSpaceResponse = await getActiveSpace();
        if (activeSpaceResponse.status === 'success' && activeSpaceResponse.data) {
          setActiveSpace(activeSpaceResponse.data);
          
          // Step 3: Load conversations for active space
          if (activeSpaceResponse.data.id) {
            await fetchSpaceData(activeSpaceResponse.data.id);
          }
        }
      } catch (error) {
        console.error('Error initializing space data:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    
    initializeSpaceData();
  }, []);

  // For debugging purposes
  useEffect(() => {
    console.log('Space data initialized:', isInitialized);
    console.log('Active space:', activeSpace);
  }, [isInitialized, activeSpace]);

  return children;
}