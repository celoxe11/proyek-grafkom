import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Array to store all picnic tables for collision detection
const allPicnicTables = [];

// Function to load a picnic table at a specific position
export function loadPicnicTable(scene, position) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    
    // Path to the picnic table model
    const picnicTablePath = './picnic_table/picnic_table.gltf';
    
    loader.load(
      picnicTablePath,
      (gltf) => {
        const picnicTable = gltf.scene;
        
        // Set position
        picnicTable.position.copy(position);
        
        // Set scale (adjust as needed for your model)
        picnicTable.scale.set(0.1, 0.1, 0.1);
        
        // Enable shadows for all meshes in the model
        picnicTable.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Improve shadow quality by using higher-quality materials
            if (child.material) {
              child.material.shadowSide = THREE.FrontSide;
              child.material.needsUpdate = true;
            }
          }
        });
        
        // Add user data for identification
        picnicTable.userData = {
          type: "picnic_table",
          interactable: true,
          collider: true
        };
        
        // Create a bounding box for the picnic table
        const boundingBox = new THREE.Box3().setFromObject(picnicTable);
        
        // Store dimensions for later use
        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        
        // Store the table height - make it slightly taller to prevent flying over
        picnicTable.userData.tableHeight = size.y + 5; // Add extra height to prevent jumping over
        
        picnicTable.userData.boundingBox = boundingBox;
        
        // Add to scene and to our tracking array
        scene.add(picnicTable);
        allPicnicTables.push(picnicTable);
        
        // console.log('Picnic table loaded at position:', position);
        
        resolve(picnicTable);
      },
      undefined, // No progress callback
      (error) => {
        console.error('Error loading picnic table:', error);
        reject(error);
      }
    );
  });
}

// Function to load multiple picnic tables in a row with spacing
export function loadPicnicTableGroup(scene, options = {}) {
  const {
    basePosition = new THREE.Vector3(-36.3, 0, 128.6),
    count = 3,
    spacing = 10,
    direction = 'right' // 'right', 'left', 'forward', 'backward'
  } = options;
  
  const picnicTables = [];
  const promises = [];
  
  // Calculate the direction vector based on the specified direction
  let directionVector = new THREE.Vector3(1, 0, 0); // Default: right
  
  if (direction === 'left') {
    directionVector.set(-1, 0, 0);
  } else if (direction === 'forward') {
    directionVector.set(0, 0, -1);
  } else if (direction === 'backward') {
    directionVector.set(0, 0, 1);
  }
  
  // Load each picnic table with appropriate spacing
  for (let i = 0; i < count; i++) {
    // Calculate position with spacing
    const position = basePosition.clone().add(
      directionVector.clone().multiplyScalar(i * spacing)
    );
    
    // Load the picnic table
    const promise = loadPicnicTable(scene, position)
      .then(table => {
        picnicTables.push(table);
        return table;
      })
      .catch(error => {
        console.error(`Failed to load picnic table ${i}:`, error);
        return null;
      });
    
    promises.push(promise);
  }
  
  // Return a promise that resolves when all tables are loaded
  return Promise.all(promises).then(() => picnicTables);
}

// Check collision between player and picnic tables using raycasting and bounding boxes
export function checkPicnicTableCollision(playerPosition, radius = 1.0) {
  // No tables to check
  if (allPicnicTables.length === 0) {
    return { collision: false };
  }
  
  // Check each direction for collisions (similar to fence collision)
  const directions = [
    new THREE.Vector3(1, 0, 0),   // Right
    new THREE.Vector3(-1, 0, 0),  // Left
    new THREE.Vector3(0, 0, 1),   // Forward
    new THREE.Vector3(0, 0, -1),  // Backward
    new THREE.Vector3(1, 0, 1).normalize(),    // Diagonal forward-right
    new THREE.Vector3(-1, 0, 1).normalize(),   // Diagonal forward-left
    new THREE.Vector3(1, 0, -1).normalize(),   // Diagonal backward-right
    new THREE.Vector3(-1, 0, -1).normalize(),  // Diagonal backward-left
  ];
  
  // Create raycaster
  const raycaster = new THREE.Raycaster();
  
  for (const table of allPicnicTables) {
    // Update the bounding box to current position
    if (!table.userData.boundingBox) {
      table.userData.boundingBox = new THREE.Box3().setFromObject(table);
    }
    
    const box = table.userData.boundingBox;
    
    // Get the center and size of the bounding box
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // Check horizontal distance first (XZ plane)
    const horizontalDist = Math.sqrt(
      Math.pow(playerPosition.x - center.x, 2) + 
      Math.pow(playerPosition.z - center.z, 2)
    );
    
    // If we're close enough horizontally, do more detailed checks
    if (horizontalDist < size.x / 2 + radius) {
      // Check if we're trying to go over the table
      // The table height is stored in userData from when we loaded it
      const tableTop = table.position.y + (table.userData.tableHeight || 10); // Default to 10 if not set
      
      // If player is below the top of the table, they can't go over it
      if (playerPosition.y < tableTop) {
        // Now do detailed raycast check
        for (const direction of directions) {
          // Set raycaster at player position pointing in this direction
          raycaster.set(playerPosition, direction);
          
          // Cast a ray from the player position in this direction
          const intersects = raycaster.intersectObject(table, true);
          
          // If we hit something within the radius, that's a collision
          if (intersects.length > 0 && intersects[0].distance < radius) {
            return {
              collision: true,
              object: table,
              direction: direction,
              distance: intersects[0].distance
            };
          }
        }
        
        // Also check with an expanded box for more reliable collision
        const expandedBox = box.clone();
        
        // Expand the box by the player radius in the XZ plane, but keep Y constraints
        expandedBox.min.x -= radius;
        expandedBox.min.z -= radius;
        expandedBox.max.x += radius;
        expandedBox.max.z += radius;
        
        // Check if player is inside the expanded box
        const playerIsInBox = 
          playerPosition.x >= expandedBox.min.x && 
          playerPosition.x <= expandedBox.max.x &&
          playerPosition.z >= expandedBox.min.z && 
          playerPosition.z <= expandedBox.max.z &&
          playerPosition.y <= tableTop;
        
        if (playerIsInBox) {
          return {
            collision: true,
            object: table,
            distance: 0
          };
        }
      }
    }
  }
  
  // No collision detected
  return { collision: false };
}
