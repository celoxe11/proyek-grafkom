// import fbx loader library
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";

const allNPCModels = []
const clock = new THREE.Clock();

export function loadNpcModel(scene, options = {}) {
  const {
    npcType = 0,
    position = new THREE.Vector3(0, 0, 0),
    rotation = new THREE.Euler(0, 0, 0)
  } = options;

  const walkingAnimationPath = `./npc/person${npcType+1}/source/person${npcType+1}_walking.fbx`;
  const defaultModelPath = `./npc/person${npcType+1}/source/person${npcType+1}.fbx`;

  return new Promise((resolve, reject) => {
    const loader = new FBXLoader();
    
    // First directly try to load the walking animation
    loader.load(
      walkingAnimationPath,
      (walkingModel) => {
        console.log(`Successfully loaded walking animation model for NPC type ${npcType}`);
        
        // If we have the walking model with animation, use it directly
        if (walkingModel.animations && walkingModel.animations.length > 0) {
          console.log(`Walking model has ${walkingModel.animations.length} animations`);
          setupAndAddModel(walkingModel, scene, position, rotation, resolve);
        } else {
          // If walking model doesn't have animations, try loading the default model and combining
          console.log("Walking model has no animations, loading default model...");
          loader.load(
            defaultModelPath,
            (characterModel) => {
              console.log(`Successfully loaded character model for NPC type ${npcType}`);
              
              // Now load the walking animation
              loader.load(
                walkingAnimationPath,
                (walkingAnimation) => {
                  console.log(`Successfully loaded walking animation for NPC type ${npcType}`);
                  
                  // Extract all animations from the walking animation model
                  if (walkingAnimation.animations && walkingAnimation.animations.length > 0) {
                    // Copy all animations from the walking animation to the character model
                    walkingAnimation.animations.forEach(animation => {
                      // Clone the animation to avoid reference issues
                      const animClone = animation.clone();
                      
                      // Give the animation a descriptive name if it doesn't have one
                      if (!animClone.name || animClone.name === '') {
                        animClone.name = `walking_${characterModel.animations.length}`;
                      }
                      
                      // Add to character model
                      characterModel.animations.push(animClone);
                      console.log(`Added animation: ${animClone.name}, Duration: ${animClone.duration}`);
                    });
                  } else {
                    console.warn(`No animations found in the walking animation file`);
                  }
                  
                  // Set up and add the model to the scene
                  setupAndAddModel(characterModel, scene, position, rotation, resolve);
                },
                (xhr) => {
                  // Animation loading progress
                },
                (error) => {
                  console.warn(`Failed to load walking animation: ${error}`);
                  // Still continue with the character model even without animation
                  setupAndAddModel(characterModel, scene, position, rotation, resolve);
                }
              );
            },
            (xhr) => {
              // Character model loading progress
            },
            (error) => {
              console.error(`Failed to load character model: ${error}`);
              reject(error);
            }
          );
        }
      },
      (xhr) => {
        // Walking model loading progress
      },
      (error) => {
        console.warn(`Failed to load walking animation model: ${error}`);
        
        // Fall back to the previous approach of loading character model first
        loader.load(
          defaultModelPath,
          (characterModel) => {
            console.log(`Successfully loaded character model for NPC type ${npcType}`);
            
            // Now load the walking animation
            loader.load(
              walkingAnimationPath,
              (walkingAnimation) => {
                console.log(`Successfully loaded walking animation for NPC type ${npcType}`);
                
                // Extract all animations from the walking animation model
                if (walkingAnimation.animations && walkingAnimation.animations.length > 0) {
                  // Copy all animations from the walking animation to the character model
                  walkingAnimation.animations.forEach(animation => {
                    // Clone the animation to avoid reference issues
                    const animClone = animation.clone();
                    
                    // Give the animation a descriptive name if it doesn't have one
                    if (!animClone.name || animClone.name === '') {
                      animClone.name = `walking_${characterModel.animations.length}`;
                    }
                    
                    // Add to character model
                    characterModel.animations.push(animClone);
                    console.log(`Added animation: ${animClone.name}, Duration: ${animClone.duration}`);
                  });
                } else {
                  console.warn(`No animations found in the walking animation file`);
                }
                
                // Set up and add the model to the scene
                setupAndAddModel(characterModel, scene, position, rotation, resolve);
              },
              (xhr) => {
                // Animation loading progress
              },
              (error) => {
                console.warn(`Failed to load walking animation: ${error}`);
                // Still continue with the character model even without animation
                setupAndAddModel(characterModel, scene, position, rotation, resolve);
              }
            );
          },
          (xhr) => {
            // Character model loading progress
          },
          (error) => {
            console.error(`Failed to load character model: ${error}`);
            reject(error);
          }
        );
      }
    );
  });
}

export function moveNpcToTicketBooth(npc, startPosition, scene) {
  // Ticket booth position
  const ticketBoothPosition = new THREE.Vector3(22.9, 0, 139.1);
  
  // Define waypoints for the path
  const waypoints = [
    startPosition.clone(), // Starting position
    new THREE.Vector3(startPosition.x, startPosition.y, ticketBoothPosition.z + 5), // Move forward to a point near the booth
    ticketBoothPosition.clone() // Final position at the ticket booth
  ];
  
  let currentWaypoint = 0;
  let waiting = false;
  let waitStartTime = 0;
  let mixer = null;
  const waitDuration = 5; // Wait for 5 seconds at the ticket booth
  const moveSpeed = 3; // Units per second
  const rotationSpeed = Math.PI; // Radians per second
  const deltaTime = 0.016; // Fixed deltaTime for consistent movement
  
  // Set up animation mixer for this specific NPC
  if (npc.animations && npc.animations.length > 0) {
    // Create a new animation mixer
    mixer = new THREE.AnimationMixer(npc);
    
    console.log(`Available animations for NPC:`, npc.animations);
    
    // Find the animation with the longest duration and most tracks
    let bestAnimIndex = -1;
    let maxScore = -1;
    
    for (let i = 0; i < npc.animations.length; i++) {
      const clip = npc.animations[i];
      console.log(`Animation ${i}: Name=${clip.name}, Duration=${clip.duration}, Tracks=${clip.tracks.length}`);
      
      // Score based on duration and number of tracks
      const score = clip.duration * 10 + clip.tracks.length;
      if (score > maxScore && clip.tracks.length > 0) {
        maxScore = score;
        bestAnimIndex = i;
      }
    }
    
    // If we found a good animation, try to play it
    if (bestAnimIndex >= 0) {
      try {
        console.log(`Using animation ${bestAnimIndex} with ${npc.animations[bestAnimIndex].tracks.length} tracks`);
        const walkClip = npc.animations[bestAnimIndex];
        
        // Don't use makeClipAdditive as it might be causing issues
        // THREE.AnimationUtils.makeClipAdditive(walkClip);
        
        // Create the action with more direct settings
        const walkAction = mixer.clipAction(walkClip);
        walkAction.timeScale = 1.0;
        walkAction.weight = 1.0;
        walkAction.loop = THREE.LoopRepeat;
        walkAction.repetitions = Infinity;
        walkAction.play();
        
        console.log("Animation started playing");
        
        // Force an update to the mixer with a small delta time
        mixer.update(0.01);
      } catch (error) {
        console.error("Failed to set up animation:", error);
        
        // Try a fallback approach - play all animations
        console.log("Trying fallback approach - playing all animations");
        try {
          for (let i = 0; i < npc.animations.length; i++) {
            if (npc.animations[i].tracks.length > 0) {
              const action = mixer.clipAction(npc.animations[i]);
              action.play();
              console.log(`Playing fallback animation ${i}`);
            }
          }
          mixer.update(0.01);
        } catch (fallbackError) {
          console.error("Fallback animation failed:", fallbackError);
        }
      }
    } else {
      console.warn("No suitable animations found for this NPC");
    }
  } else {
    console.warn("No animations available for this NPC");
  }
  
  // Movement update function
  function updateMovement() {
    // Update the animation mixer with consistent delta time
    if (mixer) {
      const delta = clock.getDelta();
      mixer.update(delta);
    }
    
    if (currentWaypoint >= waypoints.length) {
      // We've reached all waypoints
      return false;
    }
    
    if (waiting) {
      if (clock.getElapsedTime() - waitStartTime >= waitDuration) {
        waiting = false;
        currentWaypoint++;
      }
      return true;
    }
    
    const targetPosition = waypoints[currentWaypoint];
    const direction = new THREE.Vector3().subVectors(targetPosition, npc.position);
    const distance = direction.length();
    
    if (distance < 0.1) {
      // Reached waypoint
      if (currentWaypoint === waypoints.length - 2) {
        // At the position before final, wait
        waiting = true;
        waitStartTime = clock.getElapsedTime();
        
        // Turn to face the ticket booth
        const lookDirection = new THREE.Vector3().subVectors(
          waypoints[currentWaypoint + 1], 
          npc.position
        );
        const targetRotation = Math.atan2(lookDirection.x, lookDirection.z);
        npc.rotation.y = targetRotation;
      } else if (currentWaypoint === waypoints.length - 1) {
        // Reached final waypoint
        currentWaypoint++;
      } else {
        // Move to next waypoint
        currentWaypoint++;
      }
    } else {
      // Move toward waypoint
      direction.normalize();
      
      // Rotate to face movement direction
      const targetRotation = Math.atan2(direction.x, direction.z);
      
      // Smoothly interpolate rotation
      const deltaRotation = targetRotation - npc.rotation.y;
      const normalizedDeltaRotation = ((deltaRotation + Math.PI) % (Math.PI * 2)) - Math.PI;
      
      if (Math.abs(normalizedDeltaRotation) > 0.05) {
        npc.rotation.y += Math.sign(normalizedDeltaRotation) * Math.min(rotationSpeed * deltaTime, Math.abs(normalizedDeltaRotation));
      } else {
        // Only move forward if mostly facing the right direction
        npc.position.x += direction.x * moveSpeed * deltaTime;
        npc.position.y += direction.y * moveSpeed * deltaTime;
        npc.position.z += direction.z * moveSpeed * deltaTime;
      }
    }
    
    return true;
  }
  
  // Add the update function to the animation loop
  const movementInterval = setInterval(() => {
    const shouldContinue = updateMovement();
    if (!shouldContinue) {
      // Stop the animation when we're done moving
      if (mixer) {
        mixer.stopAllAction();
      }
      clearInterval(movementInterval);
    }
  }, 16); // ~60fps
  
  return {
    stop: () => {
      if (mixer) {
        mixer.stopAllAction();
      }
      clearInterval(movementInterval);
    }
  };
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
  
  // Enhanced shadow settings for the NPC
  fbx.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      
      // Improve material for better shadows
      if (child.material) {
        child.material.shadowSide = THREE.FrontSide;
        child.material.needsUpdate = true;
      }
    }
  });
  
  // Log animation status with more details
  if (fbx.animations && fbx.animations.length > 0) {
    console.log(`Model has ${fbx.animations.length} animations`);
    fbx.animations.forEach((anim, index) => {
      console.log(`Animation ${index}: Name=${anim.name}, Duration=${anim.duration}, Tracks=${anim.tracks.length}`);
    });
  } else {
    console.log(`Model has no animations`);
  }
  
  // Add to scene
  scene.add(fbx);
  
  // Store in our models array for potential future reference
  allNPCModels.push(fbx);
  
  // Resolve the promise with the loaded model
  resolve(fbx);
}
