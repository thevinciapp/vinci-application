import React, { useCallback } from 'react';
import { useLoadingOperation } from '@/hooks/useLoadingOperation';
import { createConversation } from '@/app/actions/conversations';
import { useOperationToast } from '@/hooks/useOperationToast';

const CreateConversationButton: React.FC = () => {
  const conversationCreation = useLoadingOperation(
    async (conversationData: { name: string; description: string; spaceId: string }) => {
      const { name, spaceId } = conversationData;
      return await createConversation(spaceId, name);
    },
    {
      onSuccess: (result) => {
        if (result && result.status === 'success') {
          showToastFromResult(result);      
          setIsOpen(false);
          resetForm();
        }
      },
      onError: (error) => {
        console.error('Failed to create conversation:', error);
      }
    }
  );

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    // Implement the form submission logic here
  }, []);

  return (
    <button onClick={handleSubmit}>Create Conversation</button>
  );
};

export default CreateConversationButton; 