import { BaseTab } from 'vinci-ui';
import { Space } from '@/types/space';
import DotSphere from '@/components/space/planet-icon';
import { Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Button
} from 'vinci-ui';
import { useSpaces } from '@/hooks/use-spaces';
import { toast } from '@/components/chat/ui/toast';

export interface SpaceTabProps {
  activeSpace: Space | null;
}

export function SpaceTab({ activeSpace }: SpaceTabProps) {
  const { spaces, setActiveSpaceById } = useSpaces();

  const handleSpaceSelect = async (space: Space) => {
    try {
      const success = await setActiveSpaceById(space.id);
      if (success) {
        toast({
          title: "Success",
          description: `Switched to ${space.name}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to switch space",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error switching space:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
          <BaseTab
            icon={
              activeSpace ? (
                <div className="flex items-center justify-center w-5 h-5">
                  <DotSphere 
                    size={20} 
                    seed={activeSpace.id} 
                    dotCount={80} 
                    dotSize={0.8} 
                    expandFactor={1.15} 
                    transitionSpeed={400}
                    highPerformance={true}
                  />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/[0.03] border border-white/[0.1]" />
              )
            }
            label={activeSpace?.name || 'Select Space'}
            isActive={!!activeSpace}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="center" 
        className="w-64 mt-1.5"
        style={{ maxHeight: '60vh', overflowY: 'auto' }}
        sideOffset={4}
      >
        <div>
          <DropdownMenuLabel className="text-sm font-medium">Select Space</DropdownMenuLabel>
          <DropdownMenuItem>
            <Plus size={16} className="mr-2" />
            Create New Space
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </div>
        <div className="overflow-y-auto">
          {spaces.map((space) => (
            <DropdownMenuItem
              key={space.id}
              onClick={() => handleSpaceSelect(space)}
              className="flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-white/[0.03] border border-white/[0.1]" />
              <div className="flex flex-col flex-1">
                <span>{space.name}</span>
                {space.description && (
                  <span className="text-xs text-white/40">{space.description}</span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
