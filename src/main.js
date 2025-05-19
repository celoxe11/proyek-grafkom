import * as THREE from "three";
import { ModelLoader } from "./modelLoader.js";
import Stats from 'three/examples/jsm/libs/stats.module.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color('#87CEEB'); // Sky blue

// Create two fog instances for day and night - we'll switch between them
const dayFog = new THREE.FogExp2('#87CEEB', 0.0005); // Exponential fog for more realistic effect
const nightFog = new THREE.FogExp2('#000033', 0.001); // Denser fog at night
scene.fog = dayFog; // Start with day fog

// Stats for performance monitoring
const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb
document.body.appendChild(stats.dom);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000); // Increased far plane to 20000
camera.position.set(0, 0, 0); // Relative to holder

// Camera holder setup
const cameraHolder = new THREE.Object3D();
cameraHolder.position.set(0, 80, 5); // Initial height is set to 80 here
cameraHolder.add(camera);
scene.add(cameraHolder);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadow maps
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadow maps
document.querySelector('#app').appendChild(renderer.domElement);

// Pointer lock setup
document.body.addEventListener("click", () => {
  renderer.domElement.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === renderer.domElement) {
    document.addEventListener("mousemove", onMouseMove, false);
  } else {
    document.removeEventListener("mousemove", onMouseMove, false);
  }
});

// Camera rotation logic
let pitch = 0;
function onMouseMove(event) {
  const sensitivity = 0.002;
  cameraHolder.rotation.y -= event.movementX * sensitivity; // yaw
  pitch -= event.movementY * sensitivity; // pitch

  // Clamp pitch between -90 and 90 degrees
  pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
  camera.rotation.x = pitch;
}

// Lighting setup
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0)); // Reduced intensity a bit

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(20, 100, 10); // Position the light
directionalLight.castShadow = true; // Enable shadow casting
directionalLight.shadow.mapSize.width = 2048; // Shadow map resolution
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
scene.add(directionalLight);

// Day-Night Cycle Setup
const DAY_COLOR = new THREE.Color('#87CEEB'); // Sky blue for day
const NIGHT_COLOR = new THREE.Color('#000033'); // Dark blue for night
const SUNSET_COLOR = new THREE.Color('#FF7F50'); // Coral color for sunset
const SUNRISE_COLOR = new THREE.Color('#FFA07A'); // Light salmon for sunrise
const CYCLE_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds for each phase
const DAY_NIGHT_DURATION = CYCLE_DURATION * 2; // Total cycle duration
let cycleStartTime = Date.now();

// Set the celestial distance and maximum height
const celestialDistance = 1500; // Horizontal distance
const celestialHeight = 800; // Increased maximum height for the sun's arc

// Create Sun with texture as a flat circle (Teletubbies style)
const sunGeometry = new THREE.CircleGeometry(200, 32); // Increased from 70 to 100
const sunTextureLoader = new THREE.TextureLoader();
const sunTexture = sunTextureLoader.load('/wajah_matahari.jpg'); // Make sure this path is correct

// Create sun material with texture 
const sunMaterial = new THREE.MeshBasicMaterial({ 
  map: sunTexture,
  fog: false, // Make the sun ignore fog for visibility
  color: 0xffff55, // Slight yellow tint to enhance the texture
  side: THREE.DoubleSide // Visible from both sides
});

const sun = new THREE.Mesh(sunGeometry, sunMaterial);

// Add a glow effect around the sun - using a ring that matches the circle's size
// Create a multi-layered glow effect with blur on the outer edge
const sunGlowLayers = [
  { innerRadius: 200, outerRadius: 220, opacity: 0.6 },
  { innerRadius: 220, outerRadius: 245, opacity: 0.4 },
  { innerRadius: 245, outerRadius: 275, opacity: 0.3 },
  { innerRadius: 275, outerRadius: 310, opacity: 0.2 },
  { innerRadius: 310, outerRadius: 350, opacity: 0.1 }
];

const sunGlowGroup = new THREE.Group();
sunGlowGroup.position.z = -0.1; // Place slightly behind the sun face

// Create multiple glow rings with decreasing opacity
sunGlowLayers.forEach(layer => {
  const glowGeometry = new THREE.RingGeometry(layer.innerRadius, layer.outerRadius, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdd44,
    transparent: true,
    opacity: layer.opacity,
    side: THREE.DoubleSide,
    fog: false,
    blending: THREE.AdditiveBlending // Additive blending for more realistic glow
  });
  const glowRing = new THREE.Mesh(glowGeometry, glowMaterial);
  sunGlowGroup.add(glowRing);
});

sun.add(sunGlowGroup);

// Make the sun a stronger light source
const sunLight = new THREE.PointLight(0xffffcc, 2, 10000);
sun.add(sunLight);

// Initial position - start at horizon level
sun.position.set(celestialDistance, 50, 0);
sun.rotation.set(0, 0, 0);
scene.add(sun);

// Create Moon as a flat circle too, to match the sun's style
const moonGeometry = new THREE.CircleGeometry(70, 32); // Flat circle instead of sphere
const moonMaterial = new THREE.MeshBasicMaterial({
    color: 0xDDDDFF,
    fog: false,
    side: THREE.DoubleSide
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);

// Add a subtle glow to the moon
const moonGlowGeometry = new THREE.RingGeometry(70, 85, 32);
const moonGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xaaaaff,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    fog: false
});
const moonGlow = new THREE.Mesh(moonGlowGeometry, moonGlowMaterial);
moonGlow.position.z = -0.1;
moon.add(moonGlow);

// Make the moon a light source with bluish tint
const moonLight = new THREE.PointLight(0xaaaaff, 1, 10000);
moon.add(moonLight);

// Set initial position at the opposite side, also very far
moon.position.set(-celestialDistance, 50, 0);
moon.visible = false; // Initially hidden
scene.add(moon);

// Create stars for night sky
const starsGeometry = new THREE.BufferGeometry();
const starsMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 1.5,
  transparent: true,
  opacity: 0,
  fog: false, // Make stars unaffected by fog
  sizeAttenuation: false // Stars don't get smaller with distance
});

// Create star positions
const starsCount = 2000;
const starsPositions = new Float32Array(starsCount * 3); // xyz positions
const starsSizes = new Float32Array(starsCount);
const starsColors = new Float32Array(starsCount * 3); // rgb colors

for (let i = 0; i < starsCount; i++) {
  const i3 = i * 3;
  
  // Random position on a sphere
  const radius = 5000; // Large dome of stars
  const theta = Math.random() * Math.PI; // Vertical angle (0 to PI)
  const phi = Math.random() * Math.PI * 2; // Horizontal angle (0 to 2*PI)
  
  // Only place stars in the upper hemisphere
  const x = radius * Math.sin(theta) * Math.cos(phi);
  const y = radius * Math.abs(Math.cos(theta)); // Abs to keep stars above horizon
  const z = radius * Math.sin(theta) * Math.sin(phi);
  
  starsPositions[i3] = x;
  starsPositions[i3 + 1] = y;
  starsPositions[i3 + 2] = z;
  
  // Random sizes for stars (for twinkling effect)
  starsSizes[i] = 0.5 + Math.random() * 1.5;
  
  // Slightly different colors (white to blue-white to yellow-white)
  const colorChoice = Math.random();
  if (colorChoice > 0.8) {
    // Blue-white stars
    starsColors[i3] = 0.8 + Math.random() * 0.2; // r
    starsColors[i3 + 1] = 0.8 + Math.random() * 0.2; // g
    starsColors[i3 + 2] = 1.0; // b
  } else if (colorChoice > 0.6) {
    // Yellow-white stars
    starsColors[i3] = 1.0; // r
    starsColors[i3 + 1] = 1.0; // g
    starsColors[i3 + 2] = 0.8 + Math.random() * 0.2; // b
  } else {
    // White stars
    starsColors[i3] = 1.0; // r
    starsColors[i3 + 1] = 1.0; // g
    starsColors[i3 + 2] = 1.0; // b
  }
}

// Set attributes for the stars geometry
starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
starsGeometry.setAttribute('size', new THREE.BufferAttribute(starsSizes, 1));
starsGeometry.setAttribute('color', new THREE.BufferAttribute(starsColors, 3));

// Create the stars points system
const stars = new THREE.Points(starsGeometry, starsMaterial);
scene.add(stars);

// Add twinkling animation variables
const originalStarSizes = starsSizes.slice(); // Keep original sizes for reference
let starsTwinkleTime = 0;

// Function to update time of day
function updateTimeOfDay() {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - cycleStartTime) % DAY_NIGHT_DURATION;
    
    // Calculate cycle progress (0 to 1)
    const dayProgress = (elapsedTime % CYCLE_DURATION) / CYCLE_DURATION;
    
    // Determine if it's day or night
    const isDay = elapsedTime < CYCLE_DURATION;
    
    // Update status indicator
    const timeIndicator = document.getElementById('time-indicator');
    if (timeIndicator) {
        timeIndicator.textContent = isDay ? 'Day' : 'Night';
        timeIndicator.className = isDay ? 'day' : 'night';
    }

    // Update sun and moon positions
    if (isDay) {
        // During day, move sun from east to west in a semi-circle with increased height
        const angle = dayProgress * Math.PI;
        const height = Math.sin(angle) * celestialHeight; // Use increased height
        const horizontalPos = Math.cos(angle) * celestialDistance;
        
        sun.position.set(horizontalPos, height, 0);
        sun.visible = true;
        moon.visible = false;
        
        // Reset directional light color to sunlight
        directionalLight.color.set(0xffffff);
        
        // Calculate dynamic lighting and color based on sun position
        let lightIntensity = Math.sin(dayProgress * Math.PI) * 0.8 + 0.2; // 0.2 to 1.0 to 0.2
        
        // Dynamic fog and colors depending on time of day
        if (dayProgress < 0.1 || dayProgress > 0.9) {
            // Dawn or dusk - transition colors and fog
            const sunriseWeight = dayProgress < 0.1 ? 1 - dayProgress * 10 : (dayProgress - 0.9) * 10;
            const skyColorBase = dayProgress < 0.1 ? SUNRISE_COLOR : SUNSET_COLOR;
            
            // Blend between day color and sunrise/sunset color
            const skyColor = new THREE.Color().copy(DAY_COLOR).lerp(skyColorBase, sunriseWeight);
            scene.background.copy(skyColor);
            
            // Update fog for dawn/dusk
            scene.fog = dayFog;
            dayFog.color.copy(skyColor);
            // Increase fog density during sunrise/sunset
            dayFog.density = 0.0005 + (sunriseWeight * 0.0008);
        } else {
            // Regular daytime
            scene.background.copy(DAY_COLOR);
            scene.fog = dayFog;
            dayFog.color.copy(DAY_COLOR);
            dayFog.density = 0.0005; // Standard day fog density
        }
        
        directionalLight.intensity = lightIntensity;
        
        // Update directional light to follow sun position
        directionalLight.position.copy(sun.position).normalize();
        
        // Hide stars during the day by fading them out
        starsMaterial.opacity = Math.max(0, starsMaterial.opacity - 0.02);
    } else {
        // During night, move moon from east to west in a semi-circle
        const nightProgress = dayProgress;
        const angle = nightProgress * Math.PI;
        const height = Math.sin(angle) * celestialHeight; // Match the sun's arc height
        const horizontalPos = Math.cos(angle) * celestialDistance;
        
        moon.position.set(horizontalPos, height, 0);
        moon.visible = true;
        sun.visible = false;
        
        // Evening to morning
        const lightIntensity = 0.2; // Minimal light at night
        scene.background.copy(NIGHT_COLOR);
        directionalLight.intensity = lightIntensity;
        
        // Use night fog (denser)
        scene.fog = nightFog;
        nightFog.color.copy(NIGHT_COLOR);
        
        // Dynamic fog density based on moon height
        // Foggier when moon is low, clearer when moon is high
        const moonHeight = Math.sin(angle);
        nightFog.density = 0.001 + (0.001 * (1 - moonHeight));
        
        // Update directional light for a moonlight effect
        directionalLight.position.copy(moon.position).normalize();
        directionalLight.color.set(0xaaaaff); // Bluish moonlight color
        
        // Show stars at night by fading them in
        starsMaterial.opacity = Math.min(1.0, starsMaterial.opacity + 0.02);
        
        // Update star twinkling
        updateStarTwinkle();
    }
}

// Function to make stars twinkle
function updateStarTwinkle() {
    starsTwinkleTime += 0.005;
    
    const sizes = starsGeometry.attributes.size.array;
    for (let i = 0; i < starsCount; i++) {
        // Create a unique twinkling pattern for each star
        const twinkle = Math.sin(starsTwinkleTime + i * 0.25) * 0.2 + 0.8;
        sizes[i] = originalStarSizes[i] * twinkle;
    }
    
    starsGeometry.attributes.size.needsUpdate = true;
}

// Initialize model loader
const modelLoader = new ModelLoader(scene);

// Load models
async function loadModels() {
  // Load picnic table model - scaled down to 0.5 of original size
  await modelLoader.loadModel(
    "picnic_table/picnic_table.gltf", 
    { x: 10, y: 0, z: 10 },
    { x: 0.1, y: 0.1, z: 0.1 } // Scale down to half the original size
  );
  
  // Create an array of randomized positions for trees
  const treePositions = [];
  const numTrees = 15; // Number of trees to place
  const minDistance = 15; // Minimum distance between trees
  const areaSize = 150; // Size of area to place trees in
  const minDistFromOrigin = 20; // Minimum distance from origin (player start)
  
  // Generate random positions ensuring minimum distance between trees
  for (let i = 0; i < numTrees; i++) {
    let newPos;
    let validPosition = false;
    let attempts = 0;
    
    while (!validPosition && attempts < 50) {
      attempts++;
      // Generate random position
      newPos = {
        x: Math.random() * areaSize * 2 - areaSize,
        y: 0,
        z: Math.random() * areaSize * 2 - areaSize
      };
      
      // Check distance from origin
      const distFromOrigin = Math.sqrt(newPos.x * newPos.x + newPos.z * newPos.z);
      if (distFromOrigin < minDistFromOrigin) continue;
      
      // Check distance from other trees
      validPosition = true;
      for (const pos of treePositions) {
        const dx = newPos.x - pos.x;
        const dz = newPos.z - pos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance < minDistance) {
          validPosition = false;
          break;
        }
      }
    }
    
    if (validPosition) {
      treePositions.push(newPos);
    }
  }
  
  // Load trees at the random positions
  for (const pos of treePositions) {
    // Add some variation to scale
    const scale = 0.8 + Math.random() * 0.4; // Scale between 0.8 and 1.2
    
    await modelLoader.loadModel(
      "quick_treeit_tree.glb", 
      { x: pos.x, y: 0, z: pos.z }, 
      { x: scale, y: scale, z: scale },
      { x: 0, y: Math.random() * Math.PI * 2, z: 0 } // Random rotation around Y axis
    );
  }
}

// Start loading models
loadModels();

// Ground texture setup
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load("/grass-texture-1154152.jpg");
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(200, 200);  // Adjust tiling for "endless" appearance
groundTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

// Ground material and geometry setup
const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,   // Apply texture to ground
  roughness: 1.0,
  metalness: 0.0,
});
const groundGeometry = new THREE.PlaneGeometry(10000, 10000); // Large enough for "endless" feel
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
ground.position.y = 0; // Keep it at the base level
ground.receiveShadow = true; // Enable shadow reception
scene.add(ground);

// Movement control setup
const keysPressed = {};
document.addEventListener("keydown", (event) => {
  keysPressed[event.key.toLowerCase()] = true;
  
  // Toggle bounding boxes when 'b' key is pressed
  if (event.key.toLowerCase() === 'b') {
    const isVisible = modelLoader.toggleBoundingBoxes();
    console.log(`Bounding boxes ${isVisible ? 'shown' : 'hidden'}`);
  }
});

document.addEventListener("keyup", (event) => {
  keysPressed[event.key.toLowerCase()] = false;
});

// Collision optimization variables
let lastCollisionCheck = 0;
const collisionCheckInterval = 100; // Check collisions every 100ms instead of every frame

// Function to check for collisions - optimized version
function checkCollision() {
  // Only check collision periodically to improve performance
  const now = performance.now();
  if (now - lastCollisionCheck < collisionCheckInterval && lastCollisionCheck !== 0) {
    return false; // Skip collision check if not enough time has passed
  }
  lastCollisionCheck = now;

  // Create a simplified player collision cylinder instead of a box
  // This is more efficient for collision detection
  const playerPosition = cameraHolder.position.clone();
  
  // Create a cylinder-like collision volume (simpler than a precise box)
  const playerRadius = 0.8; // Player "width"
  const playerHeight = 1.7; // Player height
  
  // Check for collision with any loaded model using the simplified volume
  if (modelLoader.checkCollisionCylinder(
    playerPosition, 
    playerRadius,
    playerHeight
  )) {
    return true; // Collision detected
  }
  
  return false; // No collision
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  stats.begin();

  // Make the flat sun always face the camera (billboard effect)
  // Calculate direction from sun to camera
  const sunToCam = new THREE.Vector3().subVectors(camera.position, sun.position).normalize();
  
  // Use lookAt but maintain the sun's position
  const lookAtPos = new THREE.Vector3().addVectors(sun.position, sunToCam);
  sun.lookAt(lookAtPos);
  
  // Ensure the moon also faces the camera
  if (moon.visible) {
    const moonToCam = new THREE.Vector3().subVectors(camera.position, moon.position).normalize();
    const moonLookAtPos = new THREE.Vector3().addVectors(moon.position, moonToCam);
    moon.lookAt(moonLookAtPos);
  }

  const speed = 0.5; // Increased speed a bit for better testing
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  // Calculate direction based on yaw only
  camera.getWorldDirection(forward);
  forward.y = 0; // Ignore vertical movement
  forward.normalize();

  right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();

  if (keysPressed["w"]) {
    // Move forward, but check for collision
    cameraHolder.position.addScaledVector(forward, speed);
    if (checkCollision()) {
      cameraHolder.position.subScaledVector(forward, speed); // Undo the movement if collision occurs
    }
  }

  if (keysPressed["s"]) {
    // Move backward, but check for collision
    cameraHolder.position.addScaledVector(forward, -speed);
    if (checkCollision()) {
      cameraHolder.position.subScaledVector(forward, -speed); // Undo the movement if collision occurs
    }
  }

  if (keysPressed["a"]) {
    // Move left, but check for collision
    cameraHolder.position.addScaledVector(right, speed);
    if (checkCollision()) {
      cameraHolder.position.subScaledVector(right, speed); // Undo the movement if collision occurs
    }
  }

  if (keysPressed["d"]) {
    // Move right, but check for collision
    cameraHolder.position.addScaledVector(right, -speed);
    if (checkCollision()) {
      cameraHolder.position.subScaledVector(right, -speed); // Undo the movement if collision occurs
    }
  }

  // Keep camera at fixed height - MODIFY THIS VALUE TO CHANGE CAMERA HEIGHT
  cameraHolder.position.y = 7; // Current height is 7 units

  // Update day-night cycle
  updateTimeOfDay();

  renderer.render(scene, camera);
  stats.end();
}

animate();

// Resize event
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
