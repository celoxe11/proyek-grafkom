import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";

const allNPCModels = [];
const clock = new THREE.Clock();

// Animation setup functions
function setupAnimationMixer(npc) {
  if (!npc.animations || npc.animations.length === 0) {
    console.warn("No animations available for this NPC");
    return null;
  }

  const mixer = new THREE.AnimationMixer(npc);
  // console.log(`Available animations for NPC:`, npc.animations);

  const animationIndices = findAnimationIndices(npc.animations);
  const actions = createAnimationActions(
    mixer,
    npc.animations,
    animationIndices
  );

  // Start with walking animation
  if (actions.walkAction) {
    actions.walkAction.play();
    // console.log("Walking animation started playing");
  }

  mixer.update(0.01);
  return { mixer, actions, animationIndices };
}

function findAnimationIndices(animations) {
  let walkingAnimIndex = -1;
  let sittingAnimIndex = -1;
  let idleAnimIndex = -1;

  // Try to identify animations by name first
  for (let i = 0; i < animations.length; i++) {
    const clipName = animations[i].name.toLowerCase();
    if (clipName.includes("walk") || clipName.includes("run")) {
      walkingAnimIndex = i;
    } else if (clipName.includes("sit")) {
      sittingAnimIndex = i;
    } else if (clipName.includes("idle") || clipName.includes("stand")) {
      idleAnimIndex = i;
    }
  }

  // Fallback logic if animations not found by name
  if (walkingAnimIndex === -1) {
    walkingAnimIndex = findBestAnimationByScore(animations);
  }
  if (sittingAnimIndex === -1 && animations.length > 1) {
    sittingAnimIndex = findFirstNonWalkingAnimation(
      animations,
      walkingAnimIndex
    );
  }
  if (idleAnimIndex === -1) {
    idleAnimIndex = animations.length > 0 ? 0 : walkingAnimIndex;
  }

  return { walkingAnimIndex, sittingAnimIndex, idleAnimIndex };
}

function findBestAnimationByScore(animations) {
  let maxScore = -1;
  let bestIndex = -1;

  for (let i = 0; i < animations.length; i++) {
    const clip = animations[i];
    const score = clip.duration * 10 + clip.tracks.length;
    if (score > maxScore && clip.tracks.length > 0) {
      maxScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function findFirstNonWalkingAnimation(animations, walkingAnimIndex) {
  for (let i = 0; i < animations.length; i++) {
    if (i !== walkingAnimIndex && animations[i].tracks.length > 0) {
      return i;
    }
  }
  return -1;
}

function createAnimationActions(mixer, animations, indices) {
  const actions = {};

  // Setup walking animation
  if (indices.walkingAnimIndex >= 0) {
    try {
      const walkClip = animations[indices.walkingAnimIndex];
      actions.walkAction = mixer.clipAction(walkClip);
      actions.walkAction.timeScale = 1.0;
      actions.walkAction.weight = 1.0;
      actions.walkAction.loop = THREE.LoopRepeat;
      actions.walkAction.repetitions = Infinity;
    } catch (error) {
      console.error("Failed to set up walking animation:", error);
    }
  }

  // Setup idle animation
  if (indices.idleAnimIndex >= 0) {
    try {
      const idleClip = animations[indices.idleAnimIndex];
      actions.idleAction = mixer.clipAction(idleClip);
      actions.idleAction.timeScale = 0.5;
      actions.idleAction.weight = 1.0;
      actions.idleAction.loop = THREE.LoopRepeat;
      actions.idleAction.repetitions = Infinity;
      actions.idleAction.paused = true;
    } catch (error) {
      console.error("Failed to set up idle animation:", error);
    }
  }

  // Setup sitting animation if available
  if (indices.sittingAnimIndex >= 0) {
    try {
      const sitClip = animations[indices.sittingAnimIndex];
      actions.sitAction = mixer.clipAction(sitClip);
      actions.sitAction.timeScale = 1.0;
      actions.sitAction.weight = 1.0;
      actions.sitAction.loop = THREE.LoopRepeat;
      actions.sitAction.repetitions = Infinity;
      actions.sitAction.paused = true;
    } catch (error) {
      console.error("Failed to set up sitting animation:", error);
    }
  }

  return actions;
}

// Animation transition functions
function switchToIdle(actions, npc, targetRotation = null) {
  if (actions.walkAction && actions.idleAction) {
    actions.walkAction.paused = true;
    actions.walkAction.weight = 0;
    actions.idleAction.reset();
    actions.idleAction.paused = false;
    actions.idleAction.weight = 1;
    actions.idleAction.play();
    // console.log("Switched to idle animation");
  } else if (actions.walkAction) {
    actions.walkAction.paused = true;
    console.log("Paused walking animation (no idle available)");
  }

  if (targetRotation !== null) {
    npc.rotation.y = targetRotation;
    // console.log(`Rotated NPC to ${targetRotation} radians`);
  }
}

function switchToWalking(actions) {
  if (actions.walkAction && actions.idleAction) {
    actions.idleAction.paused = true;
    actions.idleAction.weight = 0;
    actions.walkAction.reset();
    actions.walkAction.paused = false;
    actions.walkAction.weight = 1;
    actions.walkAction.play();
    // console.log("Switched to walking animation");
  } else if (actions.walkAction) {
    actions.walkAction.paused = false;
    // console.log("Resumed walking animation");
  }
}

// Sitting animation functions
function switchToSitting(npc, scene, mixer) {
  // console.log("Attempting to switch to sitting animation...");

  const hasSittingAnim = checkForExistingSittingAnimation(npc);

  if (hasSittingAnim.found) {
    playSittingAnimation(npc, mixer, hasSittingAnim.index);
  } else {
    loadAndApplySittingAnimation(npc, scene, mixer);
  }
}

function checkForExistingSittingAnimation(npc) {
  for (let i = 0; i < npc.animations.length; i++) {
    const clipName = npc.animations[i].name.toLowerCase();
    if (clipName.includes("sit")) {
      return { found: true, index: i };
    }
  }
  return { found: false, index: -1 };
}

function loadAndApplySittingAnimation(npc, scene, mixer) {
  const sittingAnimationPath = npc.userData?.sittingAnimationPath;
  if (!sittingAnimationPath) {
    console.warn("No sitting animation path found for NPC");
    return;
  }

  // console.log("Loading sitting animation on demand from:", sittingAnimationPath);

  const loader = new FBXLoader();
  loader.load(
    sittingAnimationPath,
    (sittingAnimation) =>
      handleSittingAnimationLoaded(sittingAnimation, npc, scene, mixer),
    (
        xhr //console.log(`Loading sitting animation: ${(xhr.loaded / xhr.total) * 100}%`),
      ) =>
      (error) => {
        console.error(`Failed to load sitting animation: ${error}`);
        stopWalkingAnimation(mixer);
      }
  );
}

function handleSittingAnimationLoaded(sittingAnimation, npc, scene, mixer) {
  // console.log("Successfully loaded sitting animation");

  if (
    !sittingAnimation.animations ||
    sittingAnimation.animations.length === 0
  ) {
    // console.warn("No animations found in the sitting animation file");
    useSittingModelAsReplacement(sittingAnimation, npc, scene);
    return;
  }

  const bestSittingAnim = findBestSittingAnimation(sittingAnimation.animations);

  if (bestSittingAnim && isAnimationCompatible(bestSittingAnim, npc)) {
    addSittingAnimationToModel(bestSittingAnim, npc);
    const newSittingAnimIndex = npc.animations.length - 1;
    playSittingAnimation(npc, mixer, newSittingAnimIndex);
  } else {
    // console.warn("Animation incompatible - using model replacement method");
    useSittingModelAsReplacement(sittingAnimation, npc, scene);
  }
}

function findBestSittingAnimation(animations) {
  let bestSittingAnim = null;
  let bestDuration = 0;

  for (let i = 0; i < animations.length; i++) {
    const anim = animations[i];
    if (anim.duration > bestDuration && anim.tracks.length > 0) {
      bestSittingAnim = anim;
      bestDuration = anim.duration;
    }
  }

  return bestSittingAnim;
}

function isAnimationCompatible(animation, npc) {
  const skeletonBones = getSkeletonBoneNames(npc);
  let tracksMatchingBones = 0;

  for (const track of animation.tracks) {
    const boneName = track.name.split(".")[0];
    if (skeletonBones.includes(boneName)) {
      tracksMatchingBones++;
    }
  }

  // console.log(`Animation track bone match: ${tracksMatchingBones}/${animation.tracks.length}`);
  return tracksMatchingBones > 0;
}

function getSkeletonBoneNames(npc) {
  const skeletonBones = [];
  npc.traverse((obj) => {
    if (obj.isBone) {
      skeletonBones.push(obj.name);
    }
  });
  return skeletonBones;
}

function addSittingAnimationToModel(animation, npc) {
  const animClone = animation.clone();

  if (!animClone.name || animClone.name === "") {
    animClone.name = "sitting_animation";
  } else if (!animClone.name.toLowerCase().includes("sit")) {
    animClone.name = `sitting_${animClone.name}`;
  }

  npc.animations.push(animClone);
  // console.log(`Added sitting animation: ${animClone.name}, Duration: ${animClone.duration}`);
}

function useSittingModelAsReplacement(sittingModel, originalModel, scene) {
  // console.log("Using sitting model as replacement...");
  
  // NEW: Store a reference between the original and replacement models
  originalModel.userData.replacementModel = sittingModel;
  sittingModel.userData.originalModel = originalModel;

  // Apply position and rotation changes as requested
  sittingModel.position.copy(originalModel.position);
  sittingModel.position.y += 1; // Changed: increased Y position adjustment
  sittingModel.position.z += 2; // Changed: adjusted Z position

  sittingModel.rotation.copy(originalModel.rotation);
  sittingModel.rotation.y -= Math.PI / 2; // Changed: rotate 90 degrees (π/2 radians)

  // console.log(`Positioned sitting model at: ${sittingModel.position.toArray()}`);
  // console.log(`Rotated sitting model to: ${sittingModel.rotation.toArray()}`);

  applyShadowSettings(sittingModel);
  originalModel.visible = false;
  scene.add(sittingModel);

  // console.log("Sitting model placed in scene");
}

function playSittingAnimation(npc, mixer, animIndex) {
  // console.log(`Playing sitting animation at index ${animIndex}`);

  if (animIndex < 0 || animIndex >= npc.animations.length) {
    // console.warn(`Invalid sitting animation index: ${animIndex}`);
    return;
  }

  const sitClip = npc.animations[animIndex];
  if (sitClip.tracks.length === 0) {
    // console.warn("Animation has no tracks, cannot play it");
    return;
  }

  try {
    // NEW: Store the pre-sitting position and rotation to revert later
    npc.userData.preSitPosition = npc.position.clone();
    npc.userData.preSitRotation = npc.rotation.clone();

    applySittingPosition(npc);
    createAndPlaySittingAction(mixer, sitClip, npc);
  } catch (error) {
    console.error("Failed to set up sitting animation:", error);
    stopWalkingAnimation(mixer);
  }
}

function applySittingPosition(npc) {
  npc.position.y += 1; // Changed: increased Y position adjustment
  npc.position.z += 2;
  npc.rotation.y -= npc.userData.sittingPositionIndex < 7 ? Math.PI / 2 : Math.PI * 3 / 2;
  

  // console.log(`Adjusted sitting position to: ${npc.position.toArray()}`);
  // console.log(`Adjusted sitting rotation to: ${npc.rotation.toArray()}`);
}

function createAndPlaySittingAction(mixer, sitClip, npc) {
  mixer.stopAllAction();
  const newMixer = new THREE.AnimationMixer(npc);

  const sitAction = newMixer.clipAction(sitClip);
  sitAction.setLoop(THREE.LoopRepeat);
  sitAction.clampWhenFinished = true;
  sitAction.timeScale = 1.0;
  sitAction.weight = 1.0;
  sitAction.repetitions = Infinity;

  sitAction.reset();
  sitAction.play();
  newMixer.update(0.01);

  // console.log("Sitting animation is now playing");
}

function stopWalkingAnimation(mixer) {
  mixer.stopAllAction();
  console.log("Stopped all animations");
}

function applyShadowSettings(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (child.material) {
        child.material.shadowSide = THREE.FrontSide;
        child.material.needsUpdate = true;
      }
    }
  });
}

// *** NEW ***: Function to handle standing up and leaving
function standUpAndLeave(npc, animationData, scene) {
  console.log(`🧍 NPC ${npc.userData.id} is standing up to leave.`);

  // Case 1: A replacement model was used for sitting
  if (npc.userData.replacementModel) {
    const replacement = npc.userData.replacementModel;
    scene.remove(replacement); // Remove the sitting model
    npc.visible = true; // Make the original walking model visible again
    delete npc.userData.replacementModel;
    delete replacement.userData.originalModel;
  }
  // Case 2: An animation was used on the original model
  else if (npc.userData.preSitPosition && npc.userData.preSitRotation) {
    // Revert the position and rotation adjustments
    npc.position.copy(npc.userData.preSitPosition);
    npc.rotation.copy(npc.userData.preSitRotation);
    delete npc.userData.preSitPosition;
    delete npc.userData.preSitRotation;
  }
  
  // In both cases, switch back to the walking animation
  if (animationData?.actions) {
    // Stop any other playing actions (like the sitting one)
    animationData.mixer.stopAllAction(); 
    switchToWalking(animationData.actions);
  }
}

// Movement functions
function createMovementController(npc, startPosition, scene) {
  // Get unique sitting destination for this NPC
  const sittingDestination = getNextAvailableSittingPosition();

  // Store the sitting position index in NPC userData for later cleanup
  npc.userData.sittingPositionIndex = sittingDestination.index;

  // MODIFIED: Added waypoints for leaving
  const waypoints = [
    startPosition.clone(),
    new THREE.Vector3(startPosition.x, startPosition.y, 144.1),
    new THREE.Vector3(22.9, 0, 139.1), // Ticket booth
    new THREE.Vector3(12.9, 0, 139.1),
    new THREE.Vector3(-20, 0, 130),
    sittingDestination.position, // Use unique sitting destination
    // --- NEW LEAVING WAYPOINTS ---
    new THREE.Vector3(-7, 0, 143),   // Point in front of ticket booth, further away
    new THREE.Vector3(8, 0, 195),   // Exit point, beyond the spawn area
  ];

  // MODIFIED: Added state properties for sitting timer and leaving
  const state = {
    currentWaypoint: 0,
    waiting: false,
    waitStartTime: 0,
    isMoving: true,
    isSitting: false,
    sittingStartTime: 0,        // NEW: To track when sitting starts
    isLeaving: false,           // NEW: To trigger the leaving sequence
    leavingWaitDuration: 20,    // NEW: Time in seconds to sit before leaving
    ticketBoothWaitDuration: 4,
    moveSpeed: 10,
    rotationSpeed: Math.PI,
    deltaTime: 0.016,
  };

  console.log(
    `🪑 NPC assigned sitting position ${
      sittingDestination.index >= 0 ? sittingDestination.index : "fallback"
    } at:`,
    sittingDestination.position
  );

  return { waypoints, state };
}

function updateMovement(npc, waypoints, state, animationData, scene) {
  if (animationData?.mixer) {
    const delta = clock.getDelta();
    animationData.mixer.update(delta);
  }

  // NEW: Check if the NPC should stand up and leave
  if (state.isSitting && !state.isLeaving) {
    if (clock.getElapsedTime() - state.sittingStartTime > state.leavingWaitDuration) {
      console.log(`NPC ${npc.userData.id} has been sitting for ${state.leavingWaitDuration}s. Time to leave!`);
      state.isLeaving = true;
      state.isSitting = false;
      state.isMoving = true;
      state.currentWaypoint++; // Move to the next waypoint (first leaving waypoint)
      standUpAndLeave(npc, animationData, scene);
    }
    // If we are sitting and not yet leaving, do nothing else
    return true;
  }

  if (state.currentWaypoint >= waypoints.length) {
    // This case should now be handled by handleWaypointReached for despawning
    return false;
  }

  if (state.waiting) {
    return handleWaiting(npc, state, animationData);
  }

  if (state.isSitting) {
    return true;
  }

  if (!state.isMoving && animationData?.actions) {
    switchToWalking(animationData.actions);
    state.isMoving = true;
  }

  return processWaypointMovement(npc, waypoints, state, animationData, scene);
}

function handleWaiting(npc, state, animationData) {
  if (state.currentWaypoint === 2) {
    // At ticket booth
    if (state.isMoving && animationData?.actions) {
      const boothRotation = Math.atan2(0, 1) + Math.PI * 0.6;
      switchToIdle(animationData.actions, npc, boothRotation);
      state.isMoving = false;
    }

    if (
      clock.getElapsedTime() - state.waitStartTime >=
      state.ticketBoothWaitDuration
    ) {
      state.waiting = false;
      state.currentWaypoint++;
      if (animationData?.actions) {
        switchToWalking(animationData.actions);
        state.isMoving = true;
      }
      // console.log(`Moving to next waypoint: ${state.currentWaypoint}`);
    }
  }
  return true;
}

function processWaypointMovement(npc, waypoints, state, animationData, scene) {
  const targetPosition = waypoints[state.currentWaypoint];
  const direction = new THREE.Vector3().subVectors(
    targetPosition,
    npc.position
  );
  const distance = direction.length();
  
  // MODIFIED: Use a consistent threshold for all but the final waypoint
  const threshold = state.currentWaypoint === waypoints.length - 1 ? 0.5 : 0.1;

  if (distance < threshold) {
    return handleWaypointReached(npc, waypoints, state, animationData, scene);
  } else {
    moveTowardsWaypoint(npc, direction, state);
  }
  return true;
}

function handleWaypointReached(npc, waypoints, state, animationData, scene) {
  const sittingWaypointIndex = 5; // The index of the sitting waypoint

  if (state.currentWaypoint === 2) {
    // At ticket booth
    state.waiting = true;
    state.waitStartTime = clock.getElapsedTime();
    // console.log("Reached ticket booth, waiting...");
  } else if (state.currentWaypoint === sittingWaypointIndex) { // MODIFIED: Check for the sitting waypoint specifically
    // At final sitting position
    console.log(`NPC ${npc.userData.id} reached final sitting position.`);

    const sittingDestination = waypoints[sittingWaypointIndex];
    npc.position.copy(sittingDestination);

    const baseRotation = Math.atan2(1, 0);
    npc.rotation.y = baseRotation;

    if (animationData?.actions) {
      if (animationData.actions.walkAction) {
        animationData.actions.walkAction.fadeOut(0.5);
      }
      if (animationData.actions.idleAction) {
        animationData.actions.idleAction.fadeOut(0.5);
      }
    }

    setTimeout(() => {
      switchToSitting(npc, scene, animationData?.mixer);
    }, 500);

    // MODIFIED: Don't advance waypoint. Set sitting state and start timer.
    state.isSitting = true;
    state.isMoving = false;
    state.sittingStartTime = clock.getElapsedTime();
  } else if (state.currentWaypoint === waypoints.length - 1) { // NEW: Reached final exit point
    console.log(`NPC ${npc.userData.id} has reached the exit and will be removed.`);
    
    // Release the sitting position so another NPC can use it
    releaseSittingPosition(npc.userData.sittingPositionIndex);

    // Remove the NPC model from the scene
    scene.remove(npc);

    // Remove the NPC from the manager
    removeNPCById(npc.userData.id);

    // Stop this NPC's update loop
    return false;

  } else {
    state.currentWaypoint++;
    // console.log(`Moving to next waypoint: ${state.currentWaypoint}`);
  }
  return true;
}

function moveTowardsWaypoint(npc, direction, state) {
  direction.normalize();
  const targetRotation = Math.atan2(direction.x, direction.z);
  const deltaRotation = targetRotation - npc.rotation.y;
  const normalizedDeltaRotation =
    ((deltaRotation + Math.PI) % (Math.PI * 2)) - Math.PI;

  if (Math.abs(normalizedDeltaRotation) > 0.05) {
    npc.rotation.y +=
      Math.sign(normalizedDeltaRotation) *
      Math.min(
        state.rotationSpeed * state.deltaTime,
        Math.abs(normalizedDeltaRotation)
      );
  } else {
    npc.position.x += direction.x * state.moveSpeed * state.deltaTime;
    npc.position.y += direction.y * state.moveSpeed * state.deltaTime;
    npc.position.z += direction.z * state.moveSpeed * state.deltaTime;
  }
}

// NPC Management System
const npcManager = {
  npcs: [],
  maxNPCs: 14,
  spawnInterval: 30 * 1000,
  lastSpawnTime: 0,
  gameStartTime: Date.now(),
  npcModelTypeCounter: 0, // RENAMED: For clarity, this counter cycles through model types
  nextNpcId: 0,           // NEW: This counter will only ever increase, ensuring unique IDs
  occupiedSittingPositions: new Set(), // Track occupied sitting positions
  celestialSystem: null,  // NEW: Reference to celestial system for time checking
};

// Define available sitting destinations
const availableSittingDestinations = [
  new THREE.Vector3(-100.8, 0, 121.9),
  new THREE.Vector3(-37.2, 0, 121.9),
  new THREE.Vector3(-68.3, 0, 121.9),
  new THREE.Vector3(-33.1, 0, 121.9),
  new THREE.Vector3(-93.3, 0, 121.9),
  new THREE.Vector3(-42.6, 0, 121.9),
  new THREE.Vector3(-62.8, 0, 121.9),
  new THREE.Vector3(-100.8, 0, 131.2),
  new THREE.Vector3(-37.2, 0, 131.2),
  new THREE.Vector3(-68.3, 0, 131.2),
  new THREE.Vector3(-33.1, 0, 131.2),
  new THREE.Vector3(-93.3, 0, 131.2),
  new THREE.Vector3(-42.6, 0, 131.2),
  new THREE.Vector3(-62.8, 0, 131.2),
];

function getNextAvailableSittingPosition() {
  // Find the first available sitting position
  for (let i = 0; i < availableSittingDestinations.length; i++) {
    if (!npcManager.occupiedSittingPositions.has(i)) {
      npcManager.occupiedSittingPositions.add(i);
      return {
        position: availableSittingDestinations[i].clone(),
        index: i,
      };
    }
  }

  // If all positions are taken, use a random position around the area
  const basePos = availableSittingDestinations[0];
  const randomOffset = new THREE.Vector3(
    (Math.random() - 0.5) * 20, // Random X offset between -10 and 10
    0,
    (Math.random() - 0.5) * 20 // Random Z offset between -10 and 10
  );

  return {
    position: basePos.clone().add(randomOffset),
    index: -1, // Indicates this is a fallback position
  };
}

function releaseSittingPosition(positionIndex) {
  if (positionIndex >= 0) {
    npcManager.occupiedSittingPositions.delete(positionIndex);
    console.log(`🪑 Sitting position ${positionIndex} has been released.`);
  }
}

// Main export functions
export function initializeNPCSystem(scene, celestialSystem = null) {
  console.log("🤖 Initializing NPC system...");
  npcManager.gameStartTime = Date.now();
  npcManager.lastSpawnTime = Date.now();
  npcManager.celestialSystem = celestialSystem; // Store reference to celestial system

  // Spawn first NPC immediately (only if it's daytime)
  if (isDaytime()) {
    spawnNewNPC(scene);
  } else {
    console.log("🌙 It's nighttime - skipping initial NPC spawn");
  }

  // Set up interval to check for new NPC spawns
  setInterval(() => {
    updateNPCSpawning(scene);
  }, 5000); // Check every 5 seconds
}

// NEW: Helper function to check if it's daytime
function isDaytime() {
  if (!npcManager.celestialSystem) {
    // If no celestial system reference, assume it's daytime (fallback)
    return true;
  }
  
  const currentHour = npcManager.celestialSystem.gameHour;
  // Consider daytime as 6 AM to 6 PM (18:00)
  return currentHour >= 6 && currentHour < 18;
}

function updateNPCSpawning(scene) {
  const currentTime = Date.now();
  const timeSinceLastSpawn = currentTime - npcManager.lastSpawnTime;

  // NEW: Check if it's daytime before spawning
  if (!isDaytime()) {
    // console.log("🌙 It's nighttime - NPCs will not spawn");
    return;
  }

  // Check if it's time to spawn and we haven't reached max NPCs
  if (
    timeSinceLastSpawn >= npcManager.spawnInterval &&
    npcManager.npcs.length < npcManager.maxNPCs
  ) {
    spawnNewNPC(scene);
    npcManager.lastSpawnTime = currentTime;
  }
}

function spawnNewNPC(scene) {
  if (npcManager.npcs.length >= npcManager.maxNPCs) {
    // console.log("🚫 Maximum NPC limit reached");
    return;
  }

  // NEW: Double-check if it's daytime before spawning
  if (!isDaytime()) {
    console.log("🌙 Nighttime detected - cancelling NPC spawn");
    return;
  }

  if (
    npcManager.occupiedSittingPositions.size >= availableSittingDestinations.length
  ) {
    console.log("🪑 All defined sitting positions are currently occupied. Waiting for an NPC to leave.");
    return; 
  }

  // CHANGED: Use the renamed counter for selecting the model
  const npcType = npcManager.npcModelTypeCounter % 2;

  const spawnPositions = [
    new THREE.Vector3(10, 0, 180),
    new THREE.Vector3(15, 0, 185),
    new THREE.Vector3(5, 0, 175),
    new THREE.Vector3(12, 0, 182),
    new THREE.Vector3(8, 0, 178),
    new THREE.Vector3(18, 0, 188),
    new THREE.Vector3(3, 0, 173),
  ];

  const spawnPosition =
    spawnPositions[npcManager.npcs.length % spawnPositions.length];

  console.log(
    `🚶 Spawning NPC with future ID ${npcManager.nextNpcId} (type ${npcType}) at position:`,
    spawnPosition
  );

  loadNpcModel(scene, {
    npcType: npcType,
    position: spawnPosition,
    rotation: new THREE.Euler(0, Math.PI, 0),
  })
    .then((npcModel) => {
      // CHANGED: Assign the persistent, unique ID from nextNpcId
      const npcData = {
        model: npcModel,
        id: npcManager.nextNpcId, // Use the unique ID counter
        type: npcType,
        spawnTime: Date.now(),
        controller: null,
      };

      console.log(`✅ NPC ${npcData.id} loaded successfully!`);
      
      npcModel.userData.id = npcData.id;
      
      npcManager.npcs.push(npcData);

      // Start movement
      setTimeout(() => {
        const movementController = moveNpcToTicketBooth(
          npcModel,
          spawnPosition,
          scene
        );
        npcData.controller = movementController;
      }, Math.random() * 2000); 

      // CHANGED: Increment BOTH counters after successful spawn
      npcManager.nextNpcId++;           // Increment the unique ID for the *next* NPC
      npcManager.npcModelTypeCounter++; // Increment the model type counter for the next NPC
    })
    .catch((error) => {
      console.error(
        `❌ Failed to load NPC with future ID ${npcManager.nextNpcId}:`,
        error
      );
    });
}

// MODIFIED: Renamed and clarified this function
function removeNPCById(npcId) {
  const npcIndex = npcManager.npcs.findIndex((npc) => npc.id === npcId);
  if (npcIndex !== -1) {
    const npcData = npcManager.npcs[npcIndex];

    // Stop movement controller just in case
    if (npcData.controller && npcData.controller.stop) {
      npcData.controller.stop();
    }
    
    // Model is already removed from scene in handleWaypointReached
    // Sitting position is already released in handleWaypointReached

    // Remove from NPC manager
    npcManager.npcs.splice(npcIndex, 1);

    console.log(`🗑️ Removed NPC ${npcId} from manager. Current count: ${npcManager.npcs.length}`);
  }
}

// OLD FUNCTION - kept for compatibility if called from elsewhere, but removeNPCById is better
export function removeNPC(npcId) {
    removeNPCById(npcId);
}

// Add function to get sitting position status
export function getSittingPositionStatus() {
  return {
    total: availableSittingDestinations.length,
    occupied: npcManager.occupiedSittingPositions.size,
    available:
      availableSittingDestinations.length -
      npcManager.occupiedSittingPositions.size,
    occupiedPositions: Array.from(npcManager.occupiedSittingPositions),
  };
}

// NPC stats and management functions
export function getNPCStats() {
  return {
    currentCount: npcManager.npcs.length,
    maxCount: npcManager.maxNPCs,
    timeSinceLastSpawn: Date.now() - npcManager.lastSpawnTime,
    nextSpawnIn: Math.max(
      0,
      npcManager.spawnInterval - (Date.now() - npcManager.lastSpawnTime)
    ),
  };
}

export function getAllNPCs() {
  return npcManager.npcs;
}

export function loadNpcModel(scene, options = {}) {
  // ... (this function remains unchanged) ...
  const {
    npcType = 0,
    position = new THREE.Vector3(0, 0, 0),
    rotation = new THREE.Euler(0, 0, 0),
  } = options;

  const walkingAnimationPath = `./npc/person${npcType + 1}/source/person${
    npcType + 1
  }_walking.fbx`;
  const defaultModelPath = `./npc/person${npcType + 1}/source/person${
    npcType + 1
  }.fbx`;
  // Define path but don't load yet
  const sittingAnimationPath = `./npc/person${npcType + 1}/source/person${
    npcType + 1
  }_sitting.fbx`;

  return new Promise((resolve, reject) => {
    const loader = new FBXLoader();

    // First directly try to load the walking animation
    loader.load(
      walkingAnimationPath,
      (walkingModel) => {
        // console.log(
        //   `Successfully loaded walking animation model for NPC type ${npcType}`
        // );

        // Store the npcType and animation path for later use
        walkingModel.userData = {
          ...walkingModel.userData,
          npcType: npcType,
          sittingAnimationPath: sittingAnimationPath,
        };

        // If we have the walking model with animation, use it directly
        if (walkingModel.animations && walkingModel.animations.length > 0) {
          // console.log(
          //   `Walking model has ${walkingModel.animations.length} animations`
          // );
          setupAndAddModel(walkingModel, scene, position, rotation, resolve);
        } else {
          // If walking model doesn't have animations, try loading the default model and combining
          // console.log(
          //   "Walking model has no animations, loading default model..."
          // );
          loader.load(
            defaultModelPath,
            (characterModel) => {
              // console.log(
              //   `Successfully loaded character model for NPC type ${npcType}`
              // );

              // Store the npcType and animation path for later use
              characterModel.userData = {
                ...characterModel.userData,
                npcType: npcType,
                sittingAnimationPath: sittingAnimationPath,
              };

              // Now load the walking animation
              loader.load(
                walkingAnimationPath,
                (walkingAnimation) => {
                  // console.log(
                  //   `Successfully loaded walking animation for NPC type ${npcType}`
                  // );

                  // Extract all animations from the walking animation model
                  if (
                    walkingAnimation.animations &&
                    walkingAnimation.animations.length > 0
                  ) {
                    // Copy all animations from the walking animation to the character model
                    walkingAnimation.animations.forEach((animation) => {
                      // Clone the animation to avoid reference issues
                      const animClone = animation.clone();

                      // Give the animation a descriptive name if it doesn't have one
                      if (!animClone.name || animClone.name === "") {
                        animClone.name = `walking_${characterModel.animations.length}`;
                      }

                      // Add to character model
                      characterModel.animations.push(animClone);
                      // console.log(
                      //   `Added animation: ${animClone.name}, Duration: ${animClone.duration}`
                      // );
                    });
                  } else {
                    console.warn(
                      `No animations found in the walking animation file`
                    );
                  }

                  // Set up and add the model to the scene
                  setupAndAddModel(
                    characterModel,
                    scene,
                    position,
                    rotation,
                    resolve
                  );
                },
                (xhr) => {
                  // Animation loading progress
                },
                (error) => {
                  console.warn(`Failed to load walking animation: ${error}`);
                  // Still continue with the character model even without animation
                  setupAndAddModel(
                    characterModel,
                    scene,
                    position,
                    rotation,
                    resolve
                  );
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
            // console.log(
            //   `Successfully loaded character model for NPC type ${npcType}`
            // );

            // Store the npcType and animation path for later use
            characterModel.userData = {
              ...characterModel.userData,
              npcType: npcType,
              sittingAnimationPath: sittingAnimationPath,
            };

            // Now load the walking animation
            loader.load(
              walkingAnimationPath,
              (walkingAnimation) => {
                // console.log(
                //   `Successfully loaded walking animation for NPC type ${npcType}`
                // );

                // Extract all animations from the walking animation model
                if (
                  walkingAnimation.animations &&
                  walkingAnimation.animations.length > 0
                ) {
                  // Copy all animations from the walking animation to the character model
                  walkingAnimation.animations.forEach((animation) => {
                    // Clone the animation to avoid reference issues
                    const animClone = animation.clone();

                    // Give the animation a descriptive name if it doesn't have one
                    if (!animClone.name || animClone.name === "") {
                      animClone.name = `walking_${characterModel.animations.length}`;
                    }

                    // Add to character model
                    characterModel.animations.push(animClone);
                    // console.log(
                    //   `Added animation: ${animClone.name}, Duration: ${animClone.duration}`
                    // );
                  });
                } else {
                  console.warn(
                    `No animations found in the walking animation file`
                  );
                }

                // Set up and add the model to the scene
                setupAndAddModel(
                  characterModel,
                  scene,
                  position,
                  rotation,
                  resolve
                );
              },
              (xhr) => {
                // Animation loading progress
              },
              (error) => {
                console.warn(`Failed to load walking animation: ${error}`);
                // Still continue with the character model even without animation
                setupAndAddModel(
                  characterModel,
                  scene,
                  position,
                  rotation,
                  resolve
                );
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
  const animationData = setupAnimationMixer(npc);
  const { waypoints, state } = createMovementController(
    npc,
    startPosition,
    scene
  );

  const movementInterval = setInterval(() => {
    const shouldContinue = updateMovement(
      npc,
      waypoints,
      state,
      animationData,
      scene
    );
    if (!shouldContinue) {
      clearInterval(movementInterval);
      // console.log("NPC movement completed");
    }
  }, 16);

  return {
    stop: () => {
      if (animationData?.mixer) {
        animationData.mixer.stopAllAction();
      }
      clearInterval(movementInterval);
      // console.log("NPC movement stopped manually");
    },
  };
}

function setupAndAddModel(fbx, scene, position, rotation, resolve) {
  // ... (this function remains unchanged) ...
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
    // console.log(`Model has ${fbx.animations.length} animations`);
    fbx.animations.forEach((anim, index) => {
      // console.log(
      //   `Animation ${index}: Name=${anim.name}, Duration=${anim.duration}, Tracks=${anim.tracks.length}`
      // );
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