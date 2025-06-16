// import fbx loader library
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";

const allNPCModels = []

export function loadNpcModel(scene, options = {}) {
  const {
    npcType = Math.floor(Math.random() * 2),
    position = new THREE.Vector3(0, 0, 0),
    rotation = new THREE.Euler(0, 0, 0)
  } = options;

  const walkingAnimationPath = `./npc/person${npcType+1}/person${npcType+1}_walking.fbx`;
  const defaultModelPath = `./npc/person${npcType+1}/source/person${npcType+1}.fbx`;

  return new Promise((resolve, reject) => {
    const loader = new FBXLoader();
    loader.load(
      walkingAnimationPath, 
      (fbx) => {
        console.log(`Successfully loaded walking animation for NPC type ${npcType}`);
        setupAndAddModel(fbx, scene, position, rotation, resolve);
      },
      (xhr) => {
        // console.log(`${(xhr.loaded / xhr.total * 100)}% loaded for NPC walking model ${npcType}`);
      },
      (error) => {
        console.warn(`Failed to load walking animation for NPC type ${npcType}. Error:`, error);
        console.log(`Falling back to default model for NPC type ${npcType}`);
        
        // Try loading the default model as fallback
        loader.load(
          defaultModelPath,
          (fbx) => {
            console.log(`Successfully loaded default model for NPC type ${npcType}`);
            setupAndAddModel(fbx, scene, position, rotation, resolve);
          },
          (xhr) => {
            // console.log(`${(xhr.loaded / xhr.total * 100)}% loaded for NPC default model ${npcType}`);
          },
          (fallbackError) => {
            console.error(`Failed to load default model for NPC type ${npcType}. Error:`, fallbackError);
            reject(fallbackError);
          }
        );
      }
    );
  });
}

function setupAndAddModel(fbx, scene, position, rotation, resolve) {
  // Scale the model
  fbx.scale.set(0.045, 0.045, 0.045);
  
  // Set position and rotation
  fbx.position.copy(position);
  fbx.rotation.copy(rotation);
  
  // Enable shadows
  fbx.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  
  // Add to scene
  scene.add(fbx);
  
  // Store in our models array for potential future reference
  allNPCModels.push(fbx);
  
  // Resolve the promise with the loaded model
  resolve(fbx);
}
