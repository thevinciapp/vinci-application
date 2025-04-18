import { useState, useMemo } from 'react';
import { BaseTab } from '@/shared/components/base-tab';
import { Space } from '@/entities/space/model/types';
import DotSphere from '@/entities/space/ui/planet-icon';
import { Plus, Edit, Trash, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu';
import { Button } from '@/shared/components/button';
import { useToast } from '@/shared/hooks/use-toast';
import { DropdownList, DropdownItem, DropdownFooterAction } from '@/shared/components/dropdown-list';
import { CreateSpaceDialog } from '@/widgets/dialogs/CreateSpaceDialog';
import { EditSpaceDialog } from '@/widgets/dialogs/EditSpaceDialog';
import { DeleteSpaceDialog } from '@/widgets/dialogs/DeleteSpaceDialog';
import { useSpaces } from '@/features/spaces/use-spaces';

const getSpaceColor = (id: string | undefined | null) => {
  if (typeof id !== 'string' || !id) {
    return {
      primary: 'hsl(0, 0%, 60%)',
      secondary: 'hsl(0, 0%, 40%)',
      gradient: 'linear-gradient(135deg, hsl(0, 0%, 60%), hsl(0, 0%, 40%))',
    };
  }
  const hash = Array.from(id).reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
  const hue = hash % 360;
  return {
    primary: `hsl(${hue}, 70%, 60%)`,
    secondary: `hsl(${(hue + 40) % 360}, 80%, 40%)`,
    gradient: `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${(hue + 40) % 360}, 80%, 40%))`,
  };
};


export function SpaceTab() {
  const { toast } = useToast();
  const { spaces, activeSpace, setActiveSpaceById } = useSpaces();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [spaceToEdit, setSpaceToEdit] = useState<Space | null>(null);
  const [spaceToDelete, setSpaceToDelete] = useState<Space | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const spaceColors = useMemo(() => {
    const colors = new Map();
    spaces.forEach(space => {
      colors.set(space.id, getSpaceColor(space.id));
    });
    return colors;
  }, [spaces]);

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

  const handleOpenCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };

  const handleOpenEditDialog = (spaceId: string | undefined) => {
    if (!spaceId) return;
    const space = spaces.find(s => s.id === spaceId);
    if (space) {
      setSpaceToEdit(space);
    }
  };

  const handleOpenDeleteDialog = (spaceId: string | undefined) => {
    if (!spaceId) return;
    const space = spaces.find(s => s.id === spaceId);
    if (space) {
      setSpaceToDelete(space);
    }
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
  };

  const handleCloseEditDialog = () => {
    setSpaceToEdit(null);
  };

  const handleCloseDeleteDialog = () => {
    setSpaceToDelete(null);
  };

  const filterSpaces = () => {
    if (!searchQuery.trim()) return spaces;
    
    const query = searchQuery.toLowerCase().trim();
    return spaces.filter(space => 
      space.name.toLowerCase().includes(query) || 
      (space.description && space.description.toLowerCase().includes(query))
    );
  };

  const sortedSpaces = [...filterSpaces()].sort((a, b) => {
    return new Date(b.updated_at || b.created_at).getTime() - 
           new Date(a.updated_at || a.created_at).getTime();
  });

  const validSortedSpaces = sortedSpaces.filter(space => typeof space.id === 'string' && space.id);

  const spaceSections = useMemo(() => ([
    {
      title: `Your Spaces ${validSortedSpaces.length > 0 ? `(${validSortedSpaces.length})` : ''}`,
      items: validSortedSpaces.map((space): DropdownItem => ({
        id: space.id,
        isActive: activeSpace?.id === space.id,
        onSelect: () => activeSpace?.id !== space.id && handleSpaceSelect(space),
        content: (
          <div className="flex w-full">
            <div className="flex-shrink-0 mr-2.5">
              {activeSpace?.id === space.id ? (
                <div className="w-4 h-4">
                  <DotSphere 
                    size={16} 
                    seed={space.id} 
                    dotCount={60} 
                    dotSize={0.7} 
                    expandFactor={1.15} 
                    transitionSpeed={400}
                    highPerformance={true}
                  />
                </div>
              ) : (
                <div 
                  className="w-4 h-4 rounded-full border border-white/10"
                  style={{ 
                    background: spaceColors.get(space.id)?.gradient || 'linear-gradient(135deg, #3f87a6, #2a5674)',
                    boxShadow: 'inset 0 0 4px rgba(0, 0, 0, 0.3)' 
                  }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-white/90 truncate">{space.name}</span>
                {activeSpace?.id === space.id && (
                  <span className="text-xs bg-white/10 text-white/80 px-1.5 py-0.5 rounded-full">Current</span>
                )}
              </div>
              {space.description && (
                <span className="text-xs text-white/60 line-clamp-1 w-full">
                  {space.description}
                </span>
              )}
            </div>
          </div>
        )
      })),
      actionButton: {
        icon: <Plus className="w-3.5 h-3.5 text-white/70" />,
        onClick: handleOpenCreateDialog,
        isLoading: false,
        ariaLabel: "Create new space"
      }
    }
  ]), [validSortedSpaces, activeSpace, spaceColors, handleSpaceSelect, handleOpenCreateDialog]);

  const footerActions: DropdownFooterAction[] = [
    {
      icon: <Edit className="w-3.5 h-3.5" />,
      label: "Edit space",
      onClick: () => {
        if (activeSpace?.id) {
          handleOpenEditDialog(activeSpace.id);
        }
      },
      isDisabled: !activeSpace
    },
    {
      icon: <Trash className="w-3.5 h-3.5" />,
      label: "Delete space",
      onClick: () => {
        if (activeSpace?.id) {
          handleOpenDeleteDialog(activeSpace.id);
        }
      },
      variant: "destructive",
      isDisabled: !activeSpace
    }
  ];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="p-0 h-auto hover:bg-white/[0.05] rounded-sm transition-all duration-200 group"
            aria-label={activeSpace ? `Current space: ${activeSpace.name}` : "Select space"}
          >
            <BaseTab
              icon={
                activeSpace ? (
                  <div className="flex items-center justify-center w-5 h-5 group-hover:scale-110 transition-transform duration-300">
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
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-all duration-200">
                    <Plus size={12} className="text-white/60 group-hover:text-white/80 transition-colors duration-200" />
                  </div>
                )
              }
              label={activeSpace?.name || 'Select Space'}
              isActive={!!activeSpace}
            />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownList 
          headerContent={
            <div className="px-2 pt-1.5 pb-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-white/40" />
                </div>
                <input
                  type="text"
                  placeholder="Search spaces..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.05] rounded-md py-1.5 pl-8 pr-3 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-white/[0.07]"
                  aria-label="Search spaces"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-2 flex items-center text-white/40 hover:text-white/60"
                  >
                    <span className="sr-only">Clear search</span>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {searchQuery && (
                <div className="flex justify-between items-center text-xs text-white/50 mt-1.5 px-1">
                  <span>
                    {validSortedSpaces.length === 0 
                      ? 'No matches found' 
                      : `Found ${validSortedSpaces.length} match${validSortedSpaces.length === 1 ? '' : 'es'}`}
                  </span>
                  <button 
                    className="hover:text-white/70 transition-colors text-xs"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          }
          sections={spaceSections}
          footerActions={footerActions}
          emptyState={
            <div className="text-sm text-white/50 flex flex-col items-center py-4">
              {searchQuery ? (
                <>
                  <Search className="w-8 h-8 text-white/20 mb-2" />
                  <p>No spaces match your search</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 text-xs" 
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full mb-2 bg-gradient-to-r from-blue-400/20 to-purple-400/20 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-white/40" />
                  </div>
                  <p>No spaces available</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 text-xs" 
                    onClick={handleOpenCreateDialog}
                  >
                    Create your first space
                  </Button>
                </>
              )}
            </div>
          }
        />
      </DropdownMenu>

      <CreateSpaceDialog 
        open={isCreateDialogOpen} 
        onClose={handleCloseCreateDialog} 
        data={undefined} 
      />

      <EditSpaceDialog 
        onClose={handleCloseEditDialog} 
        data={spaceToEdit || undefined} 
      />

      <DeleteSpaceDialog 
        onClose={handleCloseDeleteDialog} 
        data={spaceToDelete || undefined} 
      />
    </>
  );
}
