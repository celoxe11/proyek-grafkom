import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';

let allLightObjects = [];
let forcedOverride = false; // Track if lights are manually overridden

// Load streetlights on 4 park corners
function loadParkCornerStreetLights(scene, options = {}) {
  const {
    parkSize = 150,
    scale = 3,
    modelPath = "./street_light.glb",
    lightIntensity = 1.5,
    lightDistance = 80,
    debugLightSphere = false, // Enable this to show glowing spheres
  } = options;

  const cornerPositions = [
    new THREE.Vector3(parkSize, 0, parkSize),
    new THREE.Vector3(-parkSize, 0, parkSize),
    new THREE.Vector3(parkSize, 0, -parkSize),
    new THREE.Vector3(-parkSize, 0, -parkSize),
  ];

  const loader = new GLTFLoader();
  const loadedLights = [];

  cornerPositions.forEach((position, index) => {
    loader.load(
      modelPath,
      (gltf) => {
        const streetLight = gltf.scene;
        streetLight.position.copy(position);
        streetLight.scale.set(scale, scale, scale);

        streetLight.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Create rect area light to simulate lamp panel
        const lampLight = new THREE.RectAreaLight(0xffee88, 100, 8, 8); // color, intensity, width, height
        lampLight.position.set(0, 14.5, 0); // Local position relative to street light model
        lampLight.rotation.x = -Math.PI / 2; // Point downward

        // Add light to the street light model so it moves with it
        streetLight.add(lampLight);

        // Add helper to visualize the rect area light
        const lightHelper = new RectAreaLightHelper(lampLight);
        lampLight.add(lightHelper);

        scene.add(streetLight);

        const lightData = {
          model: streetLight,
          rectAreaLight: lampLight,
          lightHelper: lightHelper,
          position: position.clone(),
          index,
        };

        allLightObjects.push(lightData);
        loadedLights.push(lightData);

        // Immediately turn this light on
        lampLight.intensity = 100;
        lampLight.visible = true;
        lightHelper.visible = true;
        console.log(`🔥 Street light ${index} loaded with RectAreaLight at position:`, position.toArray());

        if (loadedLights.length === cornerPositions.length) {
          console.log(`✅ All ${loadedLights.length} corner streetlights loaded and activated`);
        }
      },
      undefined,
      (error) => {
        console.error(`❌ Failed to load streetlight ${index + 1}:`, error);
      }
    );
  });

  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (loadedLights.length === cornerPositions.length) {
        clearInterval(checkInterval);
        resolve(loadedLights);
      }
    }, 100);
  });
}

// Updates lights based on hour
function updateStreetLightsByTime(hour) {
  // If lights are manually overridden, don't change them based on time
  if (forcedOverride) {
    console.log(`🔒 Street lights are manually overridden, ignoring time-based update for hour ${hour}`);
    return;
  }

  // Street lights should be ON during nighttime (6 PM to 6 AM) and OFF during daytime (6 AM to 6 PM)
  const shouldBeOn = hour >= 18 || hour < 6; // ON from 6 PM (18:00) to 6 AM, OFF from 6 AM to 6 PM
  
  // console.log(`🕐 Updating street lights for hour ${hour}: should be ${shouldBeOn ? 'ON' : 'OFF'}`);

  allLightObjects.forEach((lightData, index) => {
    if (!lightData.rectAreaLight) {
      console.warn(`⚠️ Street light ${index} missing rectAreaLight`);
      return;
    }

    if (shouldBeOn) {
      lightData.rectAreaLight.intensity = 100;
      lightData.rectAreaLight.visible = true;
      if (lightData.lightHelper) lightData.lightHelper.visible = true;
      // console.log(`🌙 Street light ${index} turned ON at hour ${hour}`);
    } else {
      lightData.rectAreaLight.intensity = 0;
      lightData.rectAreaLight.visible = false;
      if (lightData.lightHelper) lightData.lightHelper.visible = false;
      // console.log(`☀️ Street light ${index} turned OFF at hour ${hour}`);
    }
  });
  
  // console.log(`🚦 Street lights ${shouldBeOn ? 'ON' : 'OFF'} for hour ${hour} (total lights: ${allLightObjects.length})`);
}

// Toggle all streetlights and set override state
function toggleStreetLights() {
  if (allLightObjects.length === 0) {
    console.warn('⚠️ No street lights available to toggle');
    return false;
  }

  // Check current state of first light to determine toggle direction
  const firstLight = allLightObjects[0];
  const isCurrentlyOn = firstLight.rectAreaLight && firstLight.rectAreaLight.visible;
  const newState = !isCurrentlyOn;

  allLightObjects.forEach((lightData, index) => {
    if (!lightData.rectAreaLight) return;

    if (newState) {
      lightData.rectAreaLight.intensity = 100;
      lightData.rectAreaLight.visible = true;
      if (lightData.lightHelper) lightData.lightHelper.visible = true;
    } else {
      lightData.rectAreaLight.intensity = 0;
      lightData.rectAreaLight.visible = false;
      if (lightData.lightHelper) lightData.lightHelper.visible = false;
    }
    
    console.log(`🔄 Toggled street light ${index} ${newState ? 'ON' : 'OFF'}`);
  });

  // Set override state - when manually toggled, override time-based control
  forcedOverride = true;
  console.log(`🔧 Street lights manually toggled ${newState ? 'ON' : 'OFF'} - time-based control overridden`);
  
  return newState;
}

// Reset override and allow time-based control
function resetStreetLightOverride() {
  forcedOverride = false;
  console.log(`🔓 Street light override reset - time-based control restored`);
}

// Forces all streetlights ON
function forceStreetLightsOn() {
  allLightObjects.forEach((lightData, index) => {
    if (!lightData.rectAreaLight) return;

    lightData.rectAreaLight.intensity = 100;
    lightData.rectAreaLight.visible = true;
    if (lightData.lightHelper) lightData.lightHelper.visible = true;
    console.log(`💡 Forced street light ${index} ON with RectAreaLight`);
  });
  forcedOverride = true;
}

// Check if lights are currently overridden
function isStreetLightOverridden() {
  return forcedOverride;
}

function getAllLightObjects() {
  return allLightObjects;
}

export {
  loadParkCornerStreetLights,
  updateStreetLightsByTime,
  forceStreetLightsOn,
  toggleStreetLights,
  resetStreetLightOverride,
  isStreetLightOverridden,
  getAllLightObjects,
};
