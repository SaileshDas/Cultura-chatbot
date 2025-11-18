import React, { useEffect, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei'; // <-- REMOVED useGraph
import * as THREE from 'three'; // <-- Keep this, as it solved the previous crash

// This component is the 3D model of Cultura
function CulturaModel(props) {
  const group = useRef(); 
  const { scene, animations } = useGLTF('/models/cultura_final.glb');
  
  // NOTE: We no longer use 'useGraph'

  const { actions, names } = useAnimations(animations, group);
  
  // 1. MATERIAL OVERRIDE EFFECT (The Fix)
  useEffect(() => {
    // Traverse the scene directly using the standard 'scene' object
    scene.traverse((object) => {
      // Check if the object is a mesh
      if (object.isMesh) {
        // Preserve original material if it exists and has a texture, otherwise create a new one
        if (!object.material || !object.material.map) {
          // Only override if material doesn't have a texture
          const originalColor = object.material?.color 
            ? new THREE.Color(object.material.color) 
            : new THREE.Color('#8B4513'); // Brown heritage color
          
          object.material = new THREE.MeshStandardMaterial({
            color: originalColor,
            metalness: 0.3,
            roughness: 0.7,
            emissive: new THREE.Color(0x000000),
            emissiveIntensity: 0,
          });
        }
        object.castShadow = true; 
        object.receiveShadow = true;
      }
    });

    // 2. ANIMATION LOGIC
    if (names.length > 0) {
      console.log("Available Animations:", names);
      
      const idleClipName = names.find(name => name.toLowerCase().includes('idle')) || names[0];

      if (actions[idleClipName]) {
        // Simple play command: This is the safest way to trigger the animation.
        actions[idleClipName].reset().fadeIn(0.5).play();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, names, scene]); // 'scene' object is stable, but we include it.
  
  
  // 3. Render
  return (
    <group 
      ref={group} 
      {...props} 
      dispose={null} 
      position={[0, -0.5, 0]} 
      scale={[1, 1, 1]} 
    >
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/cultura_final.glb');

export default CulturaModel;