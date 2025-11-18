import React from 'react';

/**
 * EnvironmentFallback
 * 
 * Provides a simple procedural environment when remote HDR loading fails.
 * Uses a canvas-based texture that mimics a sunset environment without
 * requiring external assets or CORS-enabled sources.
 */
export function EnvironmentFallback() {
  return (
    <>
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.8} color="#ffb088" />
      
      {/* Warm directional light to simulate sunset */}
      <directionalLight 
        position={[5, 8, 5]} 
        intensity={1.2} 
        color="#ff9944"
        castShadow 
      />
      
      {/* Fill light to soften shadows */}
      <directionalLight 
        position={[-5, 3, -5]} 
        intensity={0.5} 
        color="#88ccff"
      />
    </>
  );
}

export default EnvironmentFallback;
