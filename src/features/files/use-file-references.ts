import { useState, useMemo } from 'react';
import { FileReference } from '@/entities/file/model/types';

export function useFileReferences() {
  const [fileReferences, setFileReferences] = useState<FileReference[]>([]);

  const clearFileReferences = () => setFileReferences([]);
  
  const fileReferencesMap = useMemo(() => {
    const fileMap: Record<string, FileReference> = {};
    fileReferences.forEach(fileRef => {
      fileMap[fileRef.id] = {
        id: fileRef.id,
        path: fileRef.path,
        name: fileRef.name,
        content: fileRef.content,
        type: fileRef.type
      };
    });
    return fileMap;
  }, [fileReferences]);

  return {
    fileReferences,
    setFileReferences,
    clearFileReferences,
    fileReferencesMap
  };
} 