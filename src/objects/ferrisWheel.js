import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

// Store ferris wheel object for collision detection
let ferrisWheelObject = null;
let ferrisWheelBoundingBox = null;

export function loadFerrisWheel(scene, options = {}) {
  const {
    modelPath = "./ferris_wheel.glb",
    scale = 0.1,
    position = new THREE.Vector3(0, 0, 0),
    rotation = new THREE.Euler(0, 0, 0),
    lightIntensity = 1.5,
    lightDistance = 80,
  } = options;

  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      modelPath,
      (gltf) => {
        const object = gltf.scene;
        object.scale.set(scale, scale, scale);
        object.position.copy(position);
        object.rotation.copy(rotation);

        // Traverse the model to set up shadows
        object.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Create a point light to simulate the ferris wheel lights
        const ferrisLight = new THREE.PointLight(
          0xffee88,
          lightIntensity,
          lightDistance
        );
        ferrisLight.position.set(0, 20, 0);
        ferrisLight.castShadow = true;

        // Add the light to the ferris wheel model
        object.add(ferrisLight);

        // Check for animations and create mixer
        let mixer = null;
        if (gltf.animations && gltf.animations.length > 0) {
          console.log(
            `Found ${gltf.animations.length} animations in ferris wheel model`
          );
          mixer = new THREE.AnimationMixer(object);

          // Play the ferris wheel animation
          const clip = gltf.animations[0];
          console.log(
            `Playing ferris wheel animation: ${clip.name || "Unnamed"}`
          );
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat);
          action.clampWhenFinished = false;
          action.timeScale = 0.2; // Slow down animation to 20% of original speed
          action.reset();
          action.play();

          console.log("Ferris wheel animation started successfully");
        } else {
          console.log("No animations found in ferris wheel model");
        }

        // Store reference for collision detection
        ferrisWheelObject = object;

        // Calculate bounding box for collision detection
        const box = new THREE.Box3().setFromObject(object);
        ferrisWheelBoundingBox = box;

        scene.add(object);

        // Return both object and mixer
        resolve({ object, mixer });
      },
      undefined,
      (error) => {
        console.error(
          "An error occurred while loading the ferris wheel model:",
          error
        );
        reject(error);
      }
    );
  });
}

// Function to check collision with ferris wheel
export function checkFerrisWheelCollision(playerPosition, playerRadius = 1.5) {
  if (!ferrisWheelObject || !ferrisWheelBoundingBox) {
    return { collision: false };
  }

  // Create player bounding sphere
  const playerSphere = new THREE.Sphere(playerPosition, playerRadius);

  // Check if player sphere intersects with ferris wheel bounding box
  const collision = ferrisWheelBoundingBox.intersectsSphere(playerSphere);

  return {
    collision: collision,
    objectName: "Ferris Wheel",
  };
}

// Function to get ferris wheel bounding box (for other collision systems)
export function getFerrisWheelBoundingBox() {
  return ferrisWheelBoundingBox;
}