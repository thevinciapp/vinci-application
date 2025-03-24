import React, { useState, useMemo, useCallback } from 'react';

interface DotSphereProps {
  size?: number;
  seed?: string;
  dotCount?: number;
  dotSize?: number;
  className?: string;
  expandFactor?: number;
  transitionSpeed?: number;
  highPerformance?: boolean;
}

interface DotSphereComponent extends React.FC<DotSphereProps> {
  seedCache: Map<string, number>;
  callCount: number;
}

const round = (num: number, precision: number = 6): number => {
  const factor = Math.pow(10, precision);
  return Math.round(num * factor) / factor;
};

const Dot = React.memo(({ 
  dot, 
  isHovering, 
  size, 
  expandFactor, 
  transitionSpeed 
}: { 
  dot: {
    x: number;
    y: number;
    z: number;
    color: string;
    size: number;
    opacity: number;
    zIndex: number;
  };
  isHovering: boolean;
  size: number;
  expandFactor: number;
  transitionSpeed: number;
}) => {
  const expandedX = useMemo(() => 
    round(dot.x + (dot.x - size / 2) * (expandFactor - 1), 6),
    [dot.x, size, expandFactor]
  );
  
  const expandedY = useMemo(() => 
    round(dot.y + (dot.y - size / 2) * (expandFactor - 1), 6),
    [dot.y, size, expandFactor]
  );
  
  const expandedZ = useMemo(() => 
    round(dot.z * expandFactor, 6), 
    [dot.z, expandFactor]
  );

  const currentX = isHovering ? expandedX : dot.x;
  const currentY = isHovering ? expandedY : dot.y;
  const currentZ = isHovering ? expandedZ : dot.z;

  return (
    <div
      className="absolute rounded-full"
      style={{
        backgroundColor: dot.color,
        width: `${round(dot.size, 6)}px`,
        height: `${round(dot.size, 6)}px`,
        opacity: round(dot.opacity, 6),
        transform: `translate3d(${round(currentX, 6)}px, ${round(currentY, 6)}px, ${round(currentZ, 6)}px)`,
        transitionProperty: 'transform',
        transitionDuration: `${transitionSpeed}ms`,
        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        transitionDelay: '0s',
        zIndex: dot.zIndex,
        willChange: 'transform'
      }}
    />
  );
});

Dot.displayName = 'Dot';

const DotSphere: DotSphereComponent = ({
  size = 120,
  seed,
  dotCount = 150,
  dotSize = 2.5,
  className = '',
  expandFactor = 1.3,
  transitionSpeed = 800,
  highPerformance = false,
}) => {
  const [isHovering, setIsHovering] = useState(false);

  const actualDotCount = highPerformance ? Math.min(dotCount, 60) : dotCount;

  const seedNum = useMemo(() => {
    if (!seed) return Math.floor(Math.random() * 10000);
    
    if (!DotSphere.seedCache.has(seed)) {
      const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      DotSphere.seedCache.set(seed, hash);
    }
    
    return DotSphere.seedCache.get(seed)!;
  }, [seed]);

  const random = useCallback(() => {
    let x = Math.sin(seedNum + DotSphere.callCount++) * 10000;
    return x - Math.floor(x);
  }, [seedNum]);

  const dots = useMemo(() => {
    const sphereRadius = round((size / 2 - dotSize) * 0.8, 6);
    const points = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    DotSphere.callCount = 1;

    for (let i = 0; i < actualDotCount; i++) {
      const y = round(1 - (i / (actualDotCount - 1)) * 2, 6);
      const radius = round(Math.sqrt(1 - y * y), 6);
      const theta = round(2 * Math.PI * i / goldenRatio, 6);
      const x = round(Math.cos(theta) * radius, 6);
      const z = round(Math.sin(theta) * radius, 6);

      const hue = round((seedNum % 360) + (i * 137.5) % 360, 2);
      const saturation = round(70 + random() * 30, 2);
      const lightness = round(45 + random() * 30, 2);
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

      const sizeVariation = round(0.8 + random() * 0.6, 6);
      const finalDotSize = round(dotSize * sizeVariation, 6);

      const posX = round(x * sphereRadius + size / 2, 6);
      const posY = round(y * sphereRadius + size / 2, 6);
      const posZ = round(z * sphereRadius, 6);

      const zIndex = Math.floor(posZ);
      const opacity = round(0.6 + (posZ / sphereRadius) * 0.4, 6);

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

    return points.sort((a, b) => a.zIndex - b.zIndex);
  }, [actualDotCount, dotSize, random, seedNum, size]);

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => setIsHovering(false), []);

  return (
    <div
      className={`relative ${className}`}
      style={{
        width: size,
        height: size,
        perspective: size * 3,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {dots.map((dot, index) => (
          <Dot 
            key={index}
            dot={dot}
            isHovering={isHovering}
            size={size}
            expandFactor={expandFactor}
            transitionSpeed={transitionSpeed}
          />
        ))}
      </div>
    </div>
  );
};

DotSphere.seedCache = new Map<string, number>();
DotSphere.callCount = 1;

export default DotSphere;