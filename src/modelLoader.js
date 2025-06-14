import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Class to handle model loading and collision detection
export class ModelLoader {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.models = [];
    this.boundingBoxes = [];
    this.boundingBoxHelpers = [];
    this.showBoundingBoxes = false;
  }

  // Load a model and add it to the scene
  loadModel(path, position = { x: 0, y: 0, z: 0 }, scale = { x: 1, y: 1, z: 1 }, rotation = { x: 0, y: 0, z: 0 }) {
    return new Promise((resolve, reject) => {
      const cleanPath = path.replace(/^\/+/, '');
      
      this.loader.load(
        cleanPath,
        (gltf) => {
          const model = gltf.scene;

          model.position.set(position.x, position.y, position.z);
          model.scale.set(scale.x, scale.y, scale.z);
          model.rotation.set(rotation.x, rotation.y, rotation.z);

          model.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
            }
          });

          const boundingBox = new THREE.Box3().setFromObject(model);
          this.scene.add(model);
          this.models.push(model);
          this.boundingBoxes.push(boundingBox);

          // Optional: Add helper if bounding boxes are visible
          const helper = new THREE.Box3Helper(boundingBox, 0xffff00);
          helper.visible = this.showBoundingBoxes;
          this.boundingBoxHelpers.push(helper);
          this.scene.add(helper);

          console.log(`Model loaded: ${cleanPath}`);
          resolve(model);
        },
        undefined,
        reject
      );
    });
  }

  
  // Toggle bounding box visibility
  toggleBoundingBoxes() {
    this.showBoundingBoxes = !this.showBoundingBoxes;
    for (const helper of this.boundingBoxHelpers) {
      helper.visible = this.showBoundingBoxes;
    }
    return this.showBoundingBoxes;
  }
  
  // Update bounding boxes (useful if models move)
  updateBoundingBoxes() {
    for (let i = 0; i < this.models.length; i++) {
      this.boundingBoxes[i].setFromObject(this.models[i]);
      // Expand slightly for better collision
      this.boundingBoxes[i].expandByScalar(0.5);
    }
  }
  
  // Check if a position collides with any loaded model
  checkCollision(objectBoundingBox) {
    for (const boundingBox of this.boundingBoxes) {
      if (objectBoundingBox.intersectsBox(boundingBox)) {
        return true; // Collision detected
      }
    }
    return false; // No collision
  }

  // More efficient cylinder-based collision detection
  checkCollisionCylinder(position, radius, height) {
    // For each bounding box
    for (const boundingBox of this.boundingBoxes) {
      // Get the center of the bounding box
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      
      // Get the size of the bounding box
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      
      // Use a simpler 2D distance check (ignoring Y axis)
      const dx = position.x - center.x;
      const dz = position.z - center.z;
      const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
      
      // Calculate effective radius of the obstacle (approximating as cylinder)
      const obstacleRadius = Math.max(size.x, size.z) / 2;
      
      // Check horizontal collision (cylinder to cylinder)
      if (horizontalDistance < (radius + obstacleRadius)) {
        // Now check vertical collision (Y axis)
        const playerBottom = position.y;
        const playerTop = position.y + height;
        const objectBottom = boundingBox.min.y;
        const objectTop = boundingBox.max.y;
        
        // Check if player's vertical range overlaps with object's vertical range
        if (playerTop > objectBottom && playerBottom < objectTop) {
          return true; // Collision detected
        }
      }
    }
    
    return false; // No collision
  }
}
