import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color('#87CEEB'); // Sky blue
scene.fog = new THREE.Fog('#87CEEB', 200, 1000);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 0); // Relative to holder

// Camera holder setup
const cameraHolder = new THREE.Object3D();
cameraHolder.position.set(0, 80, 5); // Set player height
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

// Load picnic table model
let tableBoundingBox;
const loader = new GLTFLoader();
loader.load(
  "picnic_table/picnic_table.gltf",
  (gltf) => {
    gltf.scene.position.set(0, 0, 0);
    
    // Enable shadows on all meshes in the model
    gltf.scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    
    scene.add(gltf.scene);

    // Create a bounding box for the picnic table
    tableBoundingBox = new THREE.Box3().setFromObject(gltf.scene); // Create box around the model
  },
  (xhr) => {
    console.log(`${((xhr.loaded / xhr.total) * 100).toFixed(2)}% loaded`);
  },
  (error) => {
    console.error("An error occurred loading the model:", error);
  }
);

// Ground texture setup
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load("/grass-texture-1154152.jpg");
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(10, 10);  // Adjust tiling for "endless" appearance
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
});
document.addEventListener("keyup", (event) => {
  keysPressed[event.key.toLowerCase()] = false;
});

// Function to check for collisions
function checkVerticalCollision() {
  const rayOrigin = new THREE.Vector3(cameraHolder.position.x, cameraHolder.position.y + 1, cameraHolder.position.z); // Ray slightly above the player
  const rayDirection = new THREE.Vector3(0, -1, 0); // Cast ray downwards
  const ray = new THREE.Raycaster(rayOrigin, rayDirection);
  
  const intersects = ray.intersectObject(tableBoundingBox); // Check if the ray intersects the table
  return intersects.length > 0;
}

function checkCollision() {
  // Create a bounding box for the player's camera holder (the camera holder is the "player")
  const playerBox = new THREE.Box3().setFromObject(cameraHolder);

  // Check for collision with the table's bounding box
  if (tableBoundingBox && playerBox.intersectsBox(tableBoundingBox)) {
    return true; // Collision detected
  }

  return false; // No collision
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const speed = 1.5;
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

  // Keep camera at fixed height
  cameraHolder.position.y = 80;

  renderer.render(scene, camera);
}

animate();

// Resize event
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
