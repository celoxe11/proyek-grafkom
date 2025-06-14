// ObjectPlacer.js
import * as THREE from 'three';

export class ObjectPlacer {
  constructor(scene, camera, cameraHolder, modelLoader) {
    this.scene = scene;
    this.camera = camera;
    this.cameraHolder = cameraHolder;
    this.modelLoader = modelLoader;
    this.active = false;
    this.previewModel = null;
    this.minDistance = 20;
    this.maxDistance = 50;
    this.scale = { x: 10, y: 10, z: 10 }; // Increased scale for visibility

    // Create floating label
    this.labelDiv = document.createElement('div');
    this.labelDiv.style.cssText = `
      position: fixed;
      padding: 10px 20px;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff88;
      border: 2px solid #00ff88;
      border-radius: 10px;
      font-family: Arial, sans-serif;
      font-size: 16px;
      font-weight: bold;
      pointer-events: none;
      text-align: center;
      z-index: 1000;
      white-space: nowrap;
      transform: translate(-50%, -100%);
      box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
      display: none;
    `;
    this.labelDiv.innerHTML = `
      <div style="margin-bottom: 5px;">🎡 Place Merry-go-round</div>
      <div style="font-size: 14px; color: white;">
        Press <span style="color: #00ff88">ENTER</span> to place
      </div>
    `;
    document.body.appendChild(this.labelDiv);
  }

  async startPlacement() {
    try {
      if (!this.previewModel) {
        const modelPath = 'old_roundabout_merry_go_round.glb';
        this.previewModel = await this.modelLoader.loadModel(
          modelPath,
          { x: 0, y: 0, z: 0 },
          this.scale,
          { x: 0, y: 0, z: 0 }
        );

        // Make preview model semi-transparent
        this.previewModel.traverse((child) => {
          if (child.isMesh) {
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = 0.7;
            child.material.needsUpdate = true;
          }
        });

        this.scene.add(this.previewModel);
      }

      this.previewModel.visible = true;
      this.active = true;
      this.labelDiv.style.display = 'block';

    } catch (error) {
      console.error('Error in startPlacement:', error);
    }
  }

  updatePreviewTransform() {
    if (!this.active || !this.previewModel) return;

    // Get forward direction from camera
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.cameraHolder.quaternion);
    forward.y = 0;
    forward.normalize();

    // Calculate distance based on camera pitch
    const pitch = this.camera.rotation.x;
    let distance = this.minDistance;
    
    if (pitch < 0) { // Looking up
      const pitchFactor = Math.abs(pitch) / (Math.PI / 2);
      distance = THREE.MathUtils.lerp(this.minDistance, this.maxDistance, pitchFactor);
    } else { // Looking down
      const pitchFactor = pitch / (Math.PI / 2);
      distance = THREE.MathUtils.lerp(this.maxDistance, this.minDistance, pitchFactor);
    }

    // Update preview position
    const position = this.cameraHolder.position.clone();
    position.add(forward.multiplyScalar(distance));
    position.y = 0;

    this.previewModel.position.copy(position);

    // Make model face the camera
    const lookAt = new THREE.Vector3();
    lookAt.copy(this.cameraHolder.position);
    lookAt.y = this.previewModel.position.y;
    this.previewModel.lookAt(lookAt);

    // Update label position
    this.labelDiv.style.left = `${window.innerWidth / 2}px`;
    this.labelDiv.style.top = `${window.innerHeight / 2 - 50}px`;
  }

  cancelPlacement() {
    this.previewModel.visible = false;
    this.labelDiv.style.display = 'none';
    if (this.placementModeDiv) {
      this.placementModeDiv.remove();
    }
    this.active = false;
  }

  /**
   * Checks if the preview object collides with any existing objects or the ticket booth
   * @param {THREE.Box3} ticketBoothBoundingBox - The bounding box of the ticket booth
   * @returns {boolean} - True if there is a collision, false otherwise
   */
  checkPlacementCollision(ticketBoothBoundingBox) {
    if (!this.previewModel) return false;
    
    // Create a bounding box for the preview object
    const previewBox = new THREE.Box3().setFromObject(this.previewModel);
    
    // Check collision with ticket booth
    if (ticketBoothBoundingBox && previewBox.intersectsBox(ticketBoothBoundingBox)) {
      return true;
    }
    
    // Check collision with other objects in the scene
    let collisionDetected = false;
    
    this.scene.traverse((object) => {
      // Skip checking against the preview mesh itself or non-mesh objects
      if (object === this.previewModel || !object.isMesh || object === this.debugBox) return;
      
      // Skip objects without a userData.type (like terrain, skybox, etc.)
      if (!object.userData.type) return;
      
      // Create a bounding box for the current object
      const objectBox = new THREE.Box3().setFromObject(object);
      
      // Check for intersection
      if (previewBox.intersectsBox(objectBox)) {
        collisionDetected = true;
      }
    });
    
    return collisionDetected;
  }

  /**
   * Updates the preview mesh material based on collision status
   * @param {boolean} isColliding - Whether the preview mesh is colliding with something
   */
  updatePreviewMaterial(isColliding) {
    if (!this.previewModel) return;
    
    // Store original materials if not already stored
    if (!this.originalMaterials && isColliding) {
      this.originalMaterials = [];
      this.previewModel.traverse((child) => {
        if (child.isMesh && child.material) {
          this.originalMaterials.push({
            mesh: child,
            material: child.material.clone()
          });
        }
      });
    }
    
    // Apply red tint when colliding, restore original materials otherwise
    this.previewModel.traverse((child) => {
      if (child.isMesh && child.material) {
        if (isColliding) {
          // Apply red tint to material
          child.material.color.setRGB(1.0, 0.3, 0.3);
          child.material.emissive = new THREE.Color(0.3, 0, 0);
          child.material.transparent = true;
          child.material.opacity = 0.7;
        } else if (this.originalMaterials) {
          // Restore original material colors
          const originalData = this.originalMaterials.find(item => item.mesh === child);
          if (originalData) {
            child.material.color.copy(originalData.material.color);
            child.material.emissive.copy(originalData.material.emissive);
            child.material.transparent = true;
            child.material.opacity = 0.7; // Keep it semi-transparent for placement preview
          }
        }
      }
    });
    
    // Update collision state
    this.isPlacementColliding = isColliding;
  }

  /**
   * Confirms the placement of the object if there's no collision
   */
  confirmPlacement() {
    if (this.active && this.previewModel) {
      // Check for collisions before confirming placement
      if (this.isPlacementColliding) {
        console.log("Cannot place object due to collision");
        
        // Show warning to the user
        const warningContainer = document.getElementById("warning-container");
        if (warningContainer) {
          const warning = document.createElement("div");
          warning.textContent = "Cannot place object due to collision!";
          warning.style.cssText = `
            background-color: rgba(255, 0, 0, 0.85);
            color: white;
            padding: 10px 20px;
            margin-bottom: 10px;
            border-radius: 6px;
            font-weight: bold;
            text-shadow: 1px 1px 3px black;
            border: 1px solid white;
            animation: fadeOut 1.5s ease-out 1.5s forwards;
          `;
          warningContainer.appendChild(warning);
          
          // Remove after animation
          setTimeout(() => {
            warning.remove();
          }, 3000);
        }
        
        return;
      }
      
      // Original placement logic
      const finalModel = this.previewModel.clone();
      
      // Restore materials to normal (not semi-transparent)
      finalModel.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.transparent = false;
          child.material.opacity = 1.0;
        }
      });
      
      // Generate unique ID for this instance
      const uniqueId = 'merry-go-round-' + Date.now();
      finalModel.userData = {
        id: uniqueId,
        type: 'merry-go-round',
        isSpinning: false,
        spinSpeed: 0
      };

      finalModel.position.copy(this.previewModel.position);
      finalModel.rotation.copy(this.previewModel.rotation);
      this.scene.add(finalModel);

      // Add interaction with unique state for each instance
      this.modelLoader.interactionManager.addInteractableObject(
        finalModel,
        'Merry-go-round',
        (object) => {
          // Toggle spinning for this specific instance
          object.userData.isSpinning = !object.userData.isSpinning;
          object.userData.spinSpeed = object.userData.isSpinning ? 0.02 : 0;
        }
      );

      // Add collision
      if (this.modelLoader) {
        this.modelLoader.models.push(finalModel);

        const boundingBox = new THREE.Box3().setFromObject(finalModel);
        boundingBox.expandByScalar(0.5); // Add margin to avoid overlap
        this.modelLoader.boundingBoxes.push(boundingBox);

        // Optional: add helper for debugging
        if (this.modelLoader.showBoundingBoxes) {
          const helper = new THREE.Box3Helper(boundingBox, 0xffff00);
          this.modelLoader.scene.add(helper);
          this.modelLoader.boundingBoxHelpers.push(helper);
        }
      }


      // Reset placement mode
      this.previewModel.visible = false;
      this.labelDiv.style.display = 'none';
      this.active = false;

    } else {
      console.error('Error placing model:', error);
    }
  }

  // ...rest of existing code...
}