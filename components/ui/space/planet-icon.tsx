import React, { useMemo } from 'react';

interface PlanetIconProps {
  size?: number;
  seed?: string; // Ensures the same seed produces the same planet
}

const PlanetIcon = ({ size = 32, seed }: PlanetIconProps) => {
  // Compute a stable number from the seed for use in filters
  const filterSeed = useMemo(() => {
    return Math.floor(
      seed
        ? Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0)
        : Math.random() * 1000
    );
  }, [seed]);

  // Seeded random number generator for reproducibility
  const random = useMemo(() => {
    const seedNum = seed
      ? Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0)
      : Math.random() * 1000;
    let callCount = 0;
    return () => {
      callCount += 1;
      const x = Math.sin(seedNum + callCount) * 10000;
      return x - Math.floor(x);
    };
  }, [seed]);

  // Generate planet properties
  const {
    hasWater,
    baseHue,
    saturation,
    landHue,
    landColor,
    mountainColor,
    hasRings,
    ringColor,
    hasTrees,
    hasAtmosphere,
  } = useMemo(() => {
    const hasWater = random() < 0.7; // 70% chance of water
    const baseHue = hasWater ? 180 + random() * 60 : random() * 360; // Favor blues when water exists
    const saturation = 60 + random() * 30; // 60%–90%
    const landHue = hasWater ? random() * 120 : (baseHue + random() * 60) % 360; // Green/brown or varied
    const landColor = `hsl(${landHue}, 70%, 50%)`;
    const mountainColor = `hsl(${landHue}, 50%, 30%)`;
    const hasRings = random() < 0.3; // 30% chance
    const ringColor = hasRings ? `hsl(${(baseHue + 180) % 360}, ${saturation}%, 60%)` : null;
    const hasTrees = random() < 0.5; // 50% chance
    const hasAtmosphere = random() < 0.6; // 60% chance of visible atmosphere

    return {
      hasWater,
      baseHue,
      saturation,
      landHue,
      landColor,
      mountainColor,
      hasRings,
      ringColor,
      hasTrees,
      hasAtmosphere,
    };
  }, [random]);

  // Unique gradient IDs
  const baseGradientId = useMemo(() => `base_${Math.random().toString(36).substr(2, 9)}`, []);
  const shadowGradientId = useMemo(() => `shadow_${Math.random().toString(36).substr(2, 9)}`, []);
  const atmosphereGradientId = useMemo(
    () => `atmosphere_${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  // Enhanced land mass generator for more organic coastlines
  const generateLandMassPath = () => {
    const startX = 10 + random() * 20;
    const startY = 10 + random() * 20;
    // Using cubic Bézier curves for a more natural contour
    return `
      M ${startX} ${startY}
      C ${startX + 5} ${startY - 5}, ${startX + 15} ${startY - 5}, ${startX + 20} ${startY}
      C ${startX + 15} ${startY + 10}, ${startX + 5} ${startY + 10}, ${startX} ${startY}
      Z
    `;
  };

  // Enhanced mountain path with natural quadratic curves
  const generateMountainPath = (baseX: number, baseY: number) => {
    const controlX = baseX + 4 + random() * 2;
    const controlY = baseY - 4 - random() * 2;
    const endX = baseX + 8 + random() * 2;
    const endY = baseY;
    return `M ${baseX} ${baseY} Q ${controlX} ${controlY} ${endX} ${endY} Z`;
  };

  return (
    <svg width={size} height={size} viewBox="0 0 50 50" className="flex-shrink-0">
      <defs>
        {/* Realistic base gradient with an extra stop for more depth */}
        <radialGradient id={baseGradientId} cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%" stopColor={`hsl(${baseHue}, ${saturation}%, 85%)`} />
          <stop offset="50%" stopColor={`hsl(${baseHue}, ${saturation}%, 60%)`} />
          <stop offset="100%" stopColor={`hsl(${baseHue}, ${saturation}%, 35%)`} />
        </radialGradient>

        {/* Shadow gradient for 3D effect */}
        <radialGradient id={shadowGradientId} cx="0.75" cy="0.25" r="0.75">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
        </radialGradient>

        {/* Atmosphere gradient for a subtle halo */}
        {hasAtmosphere && (
          <radialGradient id={atmosphereGradientId} cx="0.5" cy="0.5" r="0.8">
            <stop offset="0%" stopColor={`hsl(${baseHue}, ${saturation}%, 85%)`} stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        )}

        {/* Bump filter: adds fractal noise and displacement for a realistic textured surface */}
        <filter id="bumpFilter" filterUnits="objectBoundingBox" x="-0.3" y="-0.3" width="1.6" height="1.6">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves="4"
            seed={filterSeed}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="3"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Specular highlights filter: adds a subtle shiny reflection */}
        <filter id="specularHighlights" filterUnits="objectBoundingBox" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
          <feSpecularLighting
            in="blur"
            surfaceScale="1"
            specularConstant="1"
            specularExponent="20"
            lightingColor="#ffffff"
            result="specOut"
          >
            <fePointLight x="-50" y="-50" z="100" />
          </feSpecularLighting>
          <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
          <feMerge>
            <feMergeNode in="specOut" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Rings */}
      {hasRings && ringColor && (
        <ellipse
          cx="25"
          cy="25"
          rx="24"
          ry="6"
          fill="none"
          stroke={ringColor}
          strokeWidth="2"
          opacity="0.7"
          transform="rotate(-20 25 25)"
        />
      )}

      {/* Planet base with filters */}
      <g filter="url(#bumpFilter)">
        <g filter="url(#specularHighlights)">
          <circle cx="25" cy="25" r="20" fill={`url(#${baseGradientId})`} />
        </g>
      </g>

      {/* Land masses */}
      <path d={generateLandMassPath()} fill={landColor} opacity="0.9" />
      {random() < 0.6 && <path d={generateLandMassPath()} fill={landColor} opacity="0.9" />}

      {/* Mountains */}
      <path d={generateMountainPath(20, 30)} fill={mountainColor} opacity="0.85" />
      {random() < 0.5 && <path d={generateMountainPath(15, 25)} fill={mountainColor} opacity="0.85" />}

      {/* Trees */}
      {hasTrees && (
        <g>
          {Array.from({ length: 3 + Math.floor(random() * 3) }).map((_, i) => (
            <circle
              key={i}
              cx={15 + random() * 20}
              cy={20 + random() * 10}
              r="1"
              fill="hsl(120, 50%, 40%)"
              opacity="0.9"
            />
          ))}
        </g>
      )}

      {/* Atmospheric glow */}
      {hasAtmosphere && (
        <circle cx="25" cy="25" r="22" fill={`url(#${atmosphereGradientId})`} opacity="0.3" />
      )}

      {/* 3D shadow for depth */}
      <circle cx="25" cy="25" r="20" fill={`url(#${shadowGradientId})`} />
    </svg>
  );
};

export default PlanetIcon;
