import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Simple procedural 3D character - drawn with THREE.js primitives
function ProceduralCharacter(props) {
  const groupRef = useRef();
  
  useEffect(() => {
    if (!groupRef.current) return;
    
    const group = groupRef.current;
    
    // Clear previous meshes
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    
    // Create a simple humanoid character using geometric shapes
    const skinColor = new THREE.Color('#d4a574'); // Skin tone
    const clothColor = new THREE.Color('#c9302c'); // Terracotta red - traditional Karnataka color
    
    // Head
    const headGeom = new THREE.SphereGeometry(0.3, 32, 32);
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.5;
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);
    
    // Eyes
    const eyeGeom = new THREE.SphereGeometry(0.08, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.1, 1.65, 0.25);
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.1, 1.65, 0.25);
    group.add(leftEye, rightEye);
    
    // Torso
    const torsoGeom = new THREE.ConeGeometry(0.25, 0.8, 32);
    const torsoMat = new THREE.MeshStandardMaterial({ color: clothColor, roughness: 0.8 });
    const torso = new THREE.Mesh(torsoGeom, torsoMat);
    torso.position.y = 0.9;
    torso.castShadow = true;
    torso.receiveShadow = true;
    group.add(torso);
    
    // Left Arm
    const armGeom = new THREE.CylinderGeometry(0.1, 0.08, 0.7, 16);
    const armMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
    const leftArm = new THREE.Mesh(armGeom, armMat);
    leftArm.position.set(-0.4, 1.2, 0);
    leftArm.rotation.z = 0.3;
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    group.add(leftArm);
    
    // Right Arm
    const rightArm = new THREE.Mesh(armGeom, armMat);
    rightArm.position.set(0.4, 1.2, 0);
    rightArm.rotation.z = -0.3;
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    group.add(rightArm);
    
    // Left Leg
    const legGeom = new THREE.CylinderGeometry(0.12, 0.1, 0.8, 16);
    const legMat = new THREE.MeshStandardMaterial({ color: '#4a4a4a', roughness: 0.8 }); // Dark pants
    const leftLeg = new THREE.Mesh(legGeom, legMat);
    leftLeg.position.set(-0.15, 0.1, 0);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    group.add(leftLeg);
    
    // Right Leg
    const rightLeg = new THREE.Mesh(legGeom, legMat);
    rightLeg.position.set(0.15, 0.1, 0);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    group.add(rightLeg);
    
    // Store references for animation
    group.userData.leftArm = leftArm;
    group.userData.rightArm = rightArm;
    group.userData.leftLeg = leftLeg;
    group.userData.rightLeg = rightLeg;
    group.userData.head = head;
    
    console.log('✓ Procedural character created successfully');
    
  }, []);
  
  return (
    <group 
      ref={groupRef} 
      {...props} 
      position={[0, 0, 0]} 
      scale={[1, 1, 1]}
    />
  );
}

export default ProceduralCharacter;
