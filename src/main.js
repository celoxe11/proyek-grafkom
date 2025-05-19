import * as THREE from "three";
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { ModelLoader } from "./modelLoader.js";
import { CelestialSystem } from "./celestial.js";
import { Terrain } from "./terrain.js";
import { PlayerControls } from "./controls.js";

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color('#87CEEB'); // Sky blue - will be overridden by celestial system

// Stats for performance monitoring
const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb
document.body.appendChild(stats.dom);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
camera.position.set(0, 0, 0); // Relative to holder

// Camera holder setup
const cameraHolder = new THREE.Object3D();
cameraHolder.position.set(0, 7, 5); // Set player height to 7
cameraHolder.add(camera);
scene.add(cameraHolder);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('#app').appendChild(renderer.domElement);

// Pointer lock setup
document.body.addEventListener("click", () => {
  renderer.domElement.requestPointerLock();
});

// Lighting setup
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(20, 100, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
scene.add(directionalLight);

// Initialize systems
const celestialSystem = new CelestialSystem(scene);
const terrain = new Terrain(scene);
const modelLoader = new ModelLoader(scene);
const playerControls = new PlayerControls(camera, cameraHolder, modelLoader);

// Create position indicator
const positionIndicator = document.createElement('div');
positionIndicator.id = 'position-indicator';
positionIndicator.className = 'indicator';
document.body.appendChild(positionIndicator);

// Update terrain texture settings
terrain.updateTextureSettings(renderer);

// Load models
async function loadModels() {
  // Load picnic table
  await modelLoader.loadModel(
    "picnic_table/picnic_table.gltf", 
    { x: 10, y: 0, z: 10 },
    { x: 0.1, y: 0.1, z: 0.1 },
    { x: 0, y: -(Math.PI / 10), z: 0 }
  );
  
  // Define fixed positions for trees
  const treePositions = [
    { x: 30, y: 0, z: 40 },
    { x: -25, y: 0, z: 35 },
    { x: 45, y: 0, z: -20 },
    { x: -40, y: 0, z: -30 },
    { x: 60, y: 0, z: 10 },
    { x: -55, y: 0, z: -15 },
    { x: 20, y: 0, z: 70 },
    { x: -35, y: 0, z: 60 },
    { x: 50, y: 0, z: -50 },
    { x: -70, y: 0, z: -55 },
    { x: 80, y: 0, z: 30 },
    { x: -65, y: 0, z: 45 },
    { x: 25, y: 0, z: -70 },
    { x: -45, y: 0, z: -80 },
    { x: 70, y: 0, z: 70 }
  ];
  
  // Load trees at the fixed positions
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
  await modelLoader.loadModel(
    "old_swings.glb",
    { x: -5, y: 0, z: -40 },
    { x: 0.9, y: 0.9, z: 0.9 },
    { x: 0, y: Math.PI / 8, z: 0 }
  );

  await modelLoader.loadModel(
    "old_roundabout_merry_go_round.glb",
    { x: -45, y: 0, z: 10 },
    { x: 13, y: 13, z: 13 }
  );
}

// Start loading models
loadModels();

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  stats.begin();
  
  // Update player controls
  playerControls.update();
  
  // Update celestial system (sun, moon, stars)
  celestialSystem.update(camera, directionalLight);
  
  // Update position indicator with X, Y, Z coordinates
  const position = cameraHolder.position;
  positionIndicator.textContent = `Position: X: ${position.x.toFixed(1)}, Y: ${position.y.toFixed(1)}, Z: ${position.z.toFixed(1)}`;
  
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
