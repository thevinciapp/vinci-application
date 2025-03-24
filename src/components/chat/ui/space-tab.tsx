import { BaseTab } from 'vinci-ui';
import { Space } from '@/types/space';
import DotSphere from '@/components/space/planet-icon';

interface SpaceTabProps {
  activeSpace: Space | null;
}

export function SpaceTab({ activeSpace }: SpaceTabProps) {
  return (
    <BaseTab
      icon={
        activeSpace ? (
          <div className="flex items-center mr-1 justify-center">
            <DotSphere 
              size={25} 
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
  );
}
