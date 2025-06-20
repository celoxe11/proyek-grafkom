import * as THREE from 'three';

export class InteractionManager {
    constructor(camera, scene, placedObjects = []) {
        this.camera = camera;
        this.scene = scene;
        this.placedObjects = placedObjects; 
        this.interactableObjects = new Map(); // Map of objects and their interactions
        this.raycaster = new THREE.Raycaster();
        this.interactionDistance = 10; // Maximum distance for interaction
        this.setupInteractionPrompt();
    }

    setupInteractionPrompt() {
        this.promptDiv = document.createElement('div');
        this.promptDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            background: rgba(0, 0, 0, 0.7);
            padding: 10px 20px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            display: none;
            z-index: 1000;
        `;
        document.body.appendChild(this.promptDiv);
    }

    getNearbyObject(position) {
        let closest = null;
        let closestDistance = Infinity;

        for (const obj of this.placedObjects) {
            if (!obj.model || !obj.onInteraction) continue;

            const objPos = new THREE.Vector3();
            obj.model.getWorldPosition(objPos);

            const distance = objPos.distanceTo(position);
            if (distance < 5 && distance < closestDistance) { // 5 unit radius
            closest = obj;
            closestDistance = distance;
            }
        }

        return closest;
        }


    addInteractableObject(object, name, interaction) {
        this.interactableObjects.set(object, {
            name: name,
            interaction: interaction,
            isAnimating: false
        });
    }

    update(cameraPosition) {
        // Create multiple raycasts in different directions for better detection
        const directions = [
            new THREE.Vector3(0, 0, -1), // Forward
            new THREE.Vector3(0.5, 0, -1), // Forward-right
            new THREE.Vector3(-0.5, 0, -1), // Forward-left
            new THREE.Vector3(0, -0.5, -1), // Forward-down
        ];

        let nearestInteraction = null;
        let shortestDistance = this.interactionDistance;

        for (const direction of directions) {
            direction.applyQuaternion(this.camera.quaternion);
            this.raycaster.set(cameraPosition, direction.normalize());

            const intersects = this.raycaster.intersectObjects(
                Array.from(this.interactableObjects.keys()), true
            );

            if (intersects.length > 0 && intersects[0].distance < shortestDistance) {
                const object = this.findParentInteractable(intersects[0].object);
                if (object && this.interactableObjects.has(object)) {
                    shortestDistance = intersects[0].distance;
                    nearestInteraction = {
                        object,
                        info: this.interactableObjects.get(object)
                    };
                }
            }
        }

        if (nearestInteraction) {
            this.promptDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #00ff88;
                background: rgba(0, 0, 0, 0.8);
                padding: 15px 30px;
                border-radius: 10px;
                font-family: Arial, sans-serif;
                font-size: 18px;
                font-weight: bold;
                display: block;
                z-index: 1000;
                border: 2px solid #00ff88;
                box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
                text-align: center;
                pointer-events: none;
            `;
            this.promptDiv.innerHTML = `
                <div style="margin-bottom: 5px;">🎡 ${nearestInteraction.info.name}</div>
                <div style="font-size: 14px;">
                    Press <span style="color: #00ff88">E</span> to interact
                </div>
            `;
            return nearestInteraction;
        }

        this.promptDiv.style.display = 'none';
        return null;
    }

    findParentInteractable(object) {
        let current = object;
        while (current) {
            if (this.interactableObjects.has(current)) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }

    handleInteraction(nearbyObject) {
        if (nearbyObject && !this.interactableObjects.get(nearbyObject.object).isAnimating) {
            const info = this.interactableObjects.get(nearbyObject.object);
            info.interaction(nearbyObject.object);
        }
    }
}
