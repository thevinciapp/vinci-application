import { useState, useMemo } from 'react';

export function useFileReferences() {
  const [fileReferences, setFileReferences] = useState<any[]>([]);

  const clearFileReferences = () => setFileReferences([]);
  
  const fileReferencesMap = useMemo(() => {
    const fileMap: Record<string, any> = {};
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