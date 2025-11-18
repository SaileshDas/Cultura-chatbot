import React, { useEffect, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

function CulturaModel(props) {
  const group = useRef();
  
  // Load the model using the hook
  const { scene, animations } = useGLTF('/models/cultura_final.glb');
  const { actions, names } = useAnimations(animations, group);
  
  useEffect(() => {
    console.log('✓ Model loaded successfully');
    console.log('✓ Animations found:', animations.length);
    
    if (!scene) return;
    
    // Apply materials to all meshes
    scene.traverse((object) => {
      if (object.isMesh || object.isSkinnedMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        
        if (object.material) {
          object.material.side = THREE.FrontSide;
        }
      }
    });

    // Play idle animation if available
    if (names && names.length > 0) {
      const idleClipName = names.find(name => name.toLowerCase().includes('idle')) || names[0];
      if (actions[idleClipName]) {
        actions[idleClipName].reset().fadeIn(0.5).play();
        console.log('✓ Playing animation:', idleClipName);
      }
    }
  }, [scene, animations, actions, names]);
  
  return (
    <group 
      ref={group} 
      {...props} 
      dispose={null} 
      position={[0, 0, 0]} 
      scale={[1, 1, 1]}
    >
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/cultura_final.glb');

export default CulturaModel;

