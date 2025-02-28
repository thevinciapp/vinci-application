import React, { useState, useMemo } from 'react';

interface DotSphereProps {
  size?: number;
  seed?: string; // Ensures the same seed produces the same sphere
  dotCount?: number; // Number of dots to display
  dotSize?: number; // Base size of each dot
  className?: string;
  expandFactor?: number; // How much the sphere expands on hover
  transitionSpeed?: number; // Speed of the expansion/contraction in ms
}

const DotSphere: React.FC<DotSphereProps> = ({
  size = 120,
  seed,
  dotCount = 150,
  dotSize = 2.5,
  className = '',
  expandFactor = 1.3,
  transitionSpeed = 800,
}) => {
  const [isHovering, setIsHovering] = useState(false);

  // Compute a stable number from the seed for consistent randomization
  const seedNum = useMemo(() => {
    return seed
      ? Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0)
      : Math.floor(Math.random() * 10000);
  }, [seed]);

  // Seeded random number generator for reproducibility
  const random = useMemo(() => {
    let callCount = 0;
    return () => {
      callCount += 1;
      const x = Math.sin(seedNum + callCount) * 10000;
      return x - Math.floor(x);
    };
  }, [seedNum]);

  // Generate dots distributed on a sphere (Fibonacci spiral algorithm)
  const dots = useMemo(() => {
    // Use a slightly smaller radius to create a tighter formation
    const sphereRadius = (size / 2 - dotSize) * 0.8; 
    const points = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < dotCount; i++) {
      // Generate point on sphere using Fibonacci spiral distribution
      const y = 1 - (i / (dotCount - 1)) * 2; // Range from 1 to -1
      const radius = Math.sqrt(1 - y * y);
      
      const theta = 2 * Math.PI * i / goldenRatio;
      
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      // Generate color based on seed and position with increased saturation and brightness
      const hue = (seedNum % 360) + (i * 137.5) % 360; // Golden angle in degrees for good distribution
      const saturation = 70 + random() * 30; // Increased saturation (was 60-100, now 70-100)
      const lightness = 45 + random() * 30; // Slightly brighter (was 40-70, now 45-75)
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

      // Add some variation to dot size but keep them larger for visibility
      const sizeVariation = 0.8 + random() * 0.6; // Slightly larger minimum (was 0.7, now 0.8)
      const finalDotSize = dotSize * sizeVariation;

      // Calculate 3D position
      const posX = x * sphereRadius + size/2;
      const posY = y * sphereRadius + size/2;
      const posZ = z * sphereRadius;

      // Adjust for z-index based on z position (dots in the back should appear behind)
      const zIndex = Math.floor(posZ);
      // Increase minimum opacity for better visibility
      const opacity = 0.6 + (posZ / sphereRadius) * 0.4; // Higher minimum opacity (was 0.4, now 0.6)
      
      points.push({
        x: posX,
        y: posY, 
        z: posZ,
        color,
        size: finalDotSize,
        opacity,
        zIndex,
      });
    }

    // Sort by z-index to handle depth properly
    return points.sort((a, b) => a.zIndex - b.zIndex);
  }, [dotCount, dotSize, random, seedNum, size]);

  return (
    <div
      className={`relative ${className}`}
      style={{
        width: size,
        height: size,
        perspective: size * 3, // 3D perspective
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {dots.map((dot, index) => {
          // Calculate expanded position when hovering
          const expandedX = dot.x + (dot.x - size/2) * (expandFactor - 1);
          const expandedY = dot.y + (dot.y - size/2) * (expandFactor - 1);
          const expandedZ = dot.z * expandFactor;
          
          // Use original or expanded position based on hover state
          const currentX = isHovering ? expandedX : dot.x;
          const currentY = isHovering ? expandedY : dot.y;
          const currentZ = isHovering ? expandedZ : dot.z;
          
          return (
            <div
              key={index}
              className="absolute rounded-full"
              style={{
                backgroundColor: dot.color,
                width: dot.size,
                height: dot.size,
                opacity: dot.opacity,
                transform: `translate3d(${currentX}px, ${currentY}px, ${currentZ}px)`,
                transition: `transform ${transitionSpeed}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
                zIndex: dot.zIndex,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DotSphere;
