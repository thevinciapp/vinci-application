import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/common/button';
import { createSpace } from '@/app/actions/spaces';
import { useLoadingOperation } from '@/hooks/useLoadingOperation';
import { useRouteTransition } from '@/hooks/useRouteTransition';
import { useOperationToast } from '@/hooks/useOperationToast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/common/dialog';
import { Input } from '@/components/ui/common/input';
import { Label } from '@/components/ui/common/label';
import { Textarea } from '@/components/ui/common/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/common/select';

// Default options
const DEFAULT_MODEL = 'claude-3-sonnet-20240229';
const DEFAULT_PROVIDER = 'anthropic';
const PROVIDER_NAMES: Record<string, string> = {
  'anthropic': 'Anthropic',
  'openai': 'OpenAI',
};

export function CreateSpaceButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('New Space');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  
  const { showToastFromResult } = useOperationToast();
  const { navigateWhenReady, isTransitioning } = useRouteTransition();
  
  // Use our enhanced loading operation hook
  const spaceCreation = useLoadingOperation(
    async (spaceData: { name: string; description: string; model: string; provider: string }) => {
      const { name, description, model, provider } = spaceData;
      return await createSpace(name, description, model, provider, true);
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
        console.error('Failed to create space:', error);
      }
    }
  );
  
  // Combined loading state
  const isLoading = spaceCreation.isLoading || isTransitioning;
  
  const resetForm = () => {
    setName('New Space');
    setDescription('');
    setProvider(DEFAULT_PROVIDER);
  };
  
  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await navigateWhenReady(async () => {
      const result = await spaceCreation.execute({
        name,
        description,
        model: DEFAULT_MODEL,
        provider,
      });
      
      return result || {};
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Space
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleCreateSpace}>
          <DialogHeader>
            <DialogTitle>Create New Space</DialogTitle>
            <DialogDescription>
              Create a new workspace for your conversations.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                placeholder="Optional"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="provider" className="text-right">
                Provider
              </Label>
              <Select value={provider} onValueChange={(value) => setProvider(value)}>
                <SelectTrigger id="provider" className="col-span-3">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Space'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 