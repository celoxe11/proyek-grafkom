import * as THREE from "three";
import { MerryGoRound } from "./objects/MerryGoRound";

// A "map" to easily select which object class to instantiate.
// This makes the system easily extendable.
const placeableObjectsMap = {
  merry_go_round: MerryGoRound,
  // 'bench': Bench, // Add other objects here later
};

export class ObjectPlacer {
  constructor(scene, camera, cameraHolder, allPlacedObjects, interactionManager) {
    this.scene = scene;
    this.camera = camera;
    this.cameraHolder = cameraHolder;
    this.allPlacedObjectsRef = allPlacedObjects;
    this.interactionManager = interactionManager;

    // State
    this.active = false;
    this.previewObject = null; // The instance of the object class (e.g., MerryGoRound)
    this.previewMesh = null;   // The actual 3D model (THREE.Group or THREE.Mesh)
    this.isPlacementColliding = false;

    // Placement Parameters (from File 1)
    this.minDistance = 10;
    this.maxDistance = 40;

    // UI Floating Label (from File 1)
    this.labelDiv = this.createPlacementLabel();
    document.body.appendChild(this.labelDiv);
  }

  createPlacementLabel() {
    const labelDiv = document.createElement('div');
    labelDiv.className = "game-ui-element"; // For easy cleanup
    labelDiv.style.cssText = `
      position: fixed;
      padding: 10px 20px;
      background: rgba(0, 0, 0, 0.85);
      color: #00ff88;
      border: 2px solid #00ff88;
      border-radius: 10px;
      font-family: 'Poppins', sans-serif;
      font-size: 16px;
      font-weight: bold;
      pointer-events: none;
      text-align: center;
      z-index: 1000;
      white-space: nowrap;
      transform: translate(-50%, -150%); /* Adjust position to be above center */
      box-shadow: 0 0 20px rgba(0, 255, 136, 0.4);
      display: none;
      transition: opacity 0.2s;
    `;
    return labelDiv;
  }

  /**
   * Starts placement mode for a specific object type.
   * @param {string} objectTypeKey - The key from placeableObjectsMap (e.g., 'merry_go_round').
   */
  async startPlacement(objectTypeKey) {
    if (this.active) this.cancelPlacement();

    const ObjectClass = placeableObjectsMap[objectTypeKey];
    if (!ObjectClass) {
      console.error(`Object type not found: ${objectTypeKey}`);
      return;
    }
    
    this.active = true;
    this.previewObject = new ObjectClass(this.scene); // Create a temporary instance

    try {
      this.previewMesh = await this.previewObject.load();
      this.scene.add(this.previewMesh);

      // Make the entire preview mesh semi-transparent for placement
      this.previewMesh.traverse((node) => {
        if (node.isMesh) {
          node.material = node.material.clone();
          node.material.transparent = true;
          node.material.opacity = 0.7;
        }
      });
      
      // Update and show the UI label
      this.labelDiv.innerHTML = `
        <div style="margin-bottom: 5px;">Placing: ${this.previewObject.name}</div>
        <div style="font-size: 14px; color: white;">Press <span style="color: #00ff88">ENTER</span> to place</div>
      `;
      this.labelDiv.style.display = 'block';
      this.updatePreviewTransform();

    } catch (error) {
      console.error("Failed to load model for preview:", error);
      this.cancelPlacement();
    }
  }

  updatePreviewTransform() {
    if (!this.active || !this.previewMesh) return;

    // Dynamic placement distance logic from File 1
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.cameraHolder.quaternion);
    forward.y = 0;
    forward.normalize();

    const pitch = this.camera.rotation.x;
    const pitchFactor = (pitch + Math.PI / 2) / Math.PI; // Normalize pitch from -PI/2 to PI/2 -> 0 to 1
    const distance = THREE.MathUtils.lerp(this.maxDistance, this.minDistance, pitchFactor);

    const position = this.cameraHolder.position.clone().add(forward.multiplyScalar(distance));
    position.y = 0; // Snap to ground level

    this.previewMesh.position.copy(position);

    // Update label position to follow the cursor/center screen
    this.labelDiv.style.left = `${window.innerWidth / 2}px`;
    this.labelDiv.style.top = `${window.innerHeight / 2}px`;

    // Check for collisions and update material color
    this.isPlacementColliding = this.checkPlacementCollision();
    this.updatePreviewMaterial(this.isPlacementColliding);
  }

  /**
   * Checks if the preview object collides with any other placed objects.
   * @returns {boolean} True if there is a collision.
   */
  checkPlacementCollision() {
    if (!this.previewMesh || !this.allPlacedObjectsRef) return false;

    const previewBox = new THREE.Box3().setFromObject(this.previewMesh);

    for (const placedObject of this.allPlacedObjectsRef) {
      // Ensure the object has a bounding box to check against
      if (placedObject.boundingBox && previewBox.intersectsBox(placedObject.boundingBox)) {
        return true; // Collision detected
      }
    }
    return false; // No collision
  }

  /**
   * Updates the preview mesh material based on collision status.
   * @param {boolean} isColliding - Whether the preview mesh is colliding.
   */
  updatePreviewMaterial(isColliding) {
    if (!this.previewMesh) return;

    const color = isColliding ? new THREE.Color(0xff4444) : new THREE.Color(0x44ff44);
    this.previewMesh.traverse((child) => {
      if (child.isMesh) {
        child.material.color.set(color);
      }
    });
  }
  
  async confirmPlacement() {
    if (!this.active || !this.previewMesh) return;

    if (this.isPlacementColliding) {
        console.warn("Cannot place object: Collision detected.");
        return;
    }

    const finalPosition = this.previewMesh.position.clone();
    const ObjectClass = this.previewObject.constructor;

    this.cancelPlacement(); // Clean up the preview first

    const finalObject = new ObjectClass(this.scene);
    try {
        await finalObject.load(finalPosition);
        this.allPlacedObjectsRef.push(finalObject);

        // ✅ Pendaftaran interaksi dilakukan setelah object berhasil dibuat dan dimuat
        if (finalObject.name === "Merry Go Round" && this.interactionManager) {
        this.interactionManager.addInteractableObject(
            finalObject.model,
            finalObject.name,
            () => {
            finalObject.userData = finalObject.userData || {};
            finalObject.userData.isSpinning = !finalObject.userData.isSpinning;
            finalObject.userData.spinSpeed = finalObject.userData.isSpinning ? 0.05 : 0;
            }
        );
        }

        console.log(`${finalObject.name} has been placed successfully.`);
        return finalObject;
    } catch (error) {
        console.error("Failed to place final object:", error);
        return null;
    }
    }


  cancelPlacement() {
    if (!this.active) return;
    this.cleanup();
  }

  // Unified cleanup function
  cleanup() {
    if (this.previewObject) {
      this.previewObject.dispose(); // This should handle removing the mesh from the scene
    }
    
    this.labelDiv.style.display = 'none';
    this.active = false;
    this.previewObject = null;
    this.previewMesh = null;
    this.isPlacementColliding = false;
  }
}