import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Global variables to store fence objects and raycaster
let allFenceObjects = [];
const raycaster = new THREE.Raycaster();

/**
 * Check collision with fences using raycasting
 * @param {THREE.Vector3} playerPosition - Current player position
 * @param {THREE.Vector3} direction - Direction vector to check collision
 * @param {number} distance - Maximum distance to check (default: 2)
 * @returns {Object} - Collision result with collision flag and hit fence
 */
export function checkFenceCollision(playerPosition, direction, distance = 2) {
    if (allFenceObjects.length === 0) {
        return { collision: false, fence: null, distance: 0 };
    }

    // Set up raycaster from player position in the given direction
    raycaster.set(playerPosition, direction.normalize());
    
    // Check intersections with all fence objects
    const intersections = raycaster.intersectObjects(allFenceObjects, true);
    
    if (intersections.length > 0) {
        const intersection = intersections[0];
        if (intersection.distance <= distance) {
            return {
                collision: true,
                fence: intersection.object,
                distance: intersection.distance,
                point: intersection.point
            };
        }
    }
    
    return { collision: false, fence: null, distance: 0 };
}

/**
 * Check collision in multiple directions around the player
 * @param {THREE.Vector3} playerPosition - Current player position
 * @param {number} checkRadius - Radius to check around player (default: 1.5)
 * @returns {Object} - Collision result
 */
export function checkFenceCollisionMultiDirection(playerPosition, checkRadius = 1.5) {
    const directions = [
        new THREE.Vector3(1, 0, 0),   // Right
        new THREE.Vector3(-1, 0, 0),  // Left
        new THREE.Vector3(0, 0, 1),   // Forward
        new THREE.Vector3(0, 0, -1),  // Backward
        new THREE.Vector3(1, 0, 1).normalize(),   // Forward-right
        new THREE.Vector3(-1, 0, 1).normalize(),  // Forward-left
        new THREE.Vector3(1, 0, -1).normalize(),  // Backward-right
        new THREE.Vector3(-1, 0, -1).normalize()  // Backward-left
    ];

    for (const direction of directions) {
        const result = checkFenceCollision(playerPosition, direction, checkRadius);
        if (result.collision) {
            return result;
        }
    }

    return { collision: false, fence: null, distance: 0 };
}

/**
 * Loads hedge fences around the perimeter of the park
 * @param {THREE.Scene} scene - The scene to add hedge fences to
 * @param {Object} options - Configuration options
 * @param {THREE.Vector3} options.centerPoint - Center point of the park (default: origin)
 * @param {Number} options.distance - Distance from center to place fences (default: 50)
 * @param {Number} options.fenceHeight - Height of the fences (default: 3)
 * @returns {Promise<Array<THREE.Object3D>>} - Promise resolving to array of fence objects
 */
export function loadHedgeFences(scene, options = {}) {
    const {
        centerPoint = new THREE.Vector3(0, 0, 0),
        distance = 150,
        fenceHeight = 10,
        spacing = 10, // Space between fence segments
        modelPath = './simple_brick_fence.glb' // Use the specified model
    } = options;

    return new Promise((resolve) => {
        const fenceObjects = [];
        const loader = new GLTFLoader();
        
        // Generate fence positions for a square boundary
        const fencePositions = generateFencePositions(centerPoint, distance, spacing);
        
        // First try to load the specified model
        loader.load(
            modelPath,
            (gltf) => {
                const hedgeModel = gltf.scene;
                
                // Create all fence segments using the loaded model
                createModelHedges(scene, hedgeModel, fencePositions, spacing, fenceHeight, fenceObjects);
                
                // Store fence objects globally for raycasting
                allFenceObjects = [...fenceObjects];
                
                resolve(fenceObjects);
            },
            // Progress callback
            (xhr) => {
                // Removed console.log for loading progress
            },
            // Error callback
            (error) => {
                console.error("Error loading hedge fence model:", error);
                
                // Create simple box hedges as fallback
                createSimpleHedges(scene, fencePositions, spacing, fenceHeight, 1, fenceObjects);
                
                // Store fence objects globally for raycasting
                allFenceObjects = [...fenceObjects];
                
                resolve(fenceObjects);
            }
        );
    });
}

/**
 * Generate fence positions for a square boundary
 */
function generateFencePositions(centerPoint, distance, fenceLength) {
    const fencePositions = [];
    const parkSize = distance * 2;
    
    // Spacing between fence segments
    const gapBetweenFences = 2;
    const effectiveLength = fenceLength + gapBetweenFences;
    
    // Calculate segments
    const fenceSegments = Math.floor(parkSize / effectiveLength);
    
    const startX = centerPoint.x - distance;
    const startZ = centerPoint.z - distance;
    const endX = centerPoint.x + distance;
    const endZ = centerPoint.z + distance;
    
    // Fence base height
    const fenceBaseHeight = 7;
    
    // Gate positions from the parameters provided
    const gateStartX = -24.3; // Expanded gate start position
    const gateEndX = 29.5;    // Expanded gate end position
    const gateZ = 150;      // Updated Z position for the gate to match new distance
    
    // Define gate parameters
    const gateWidth = gateEndX - gateStartX; // Width of the gate
    const gateDepth = 15;                    // Increased depth for the gate entrance
    
    // Store problematic fence positions that need to be excluded
    const excludePositions = [
        { x: -24.3, z: 99.8 },
        { x: 29.5, z: 101.6 },
        { x: 0.5, z: 102.2 }
    ];
    
    // Bottom edge (Z fixed at minimum, X varies) - with gateway
    for (let i = 0; i <= fenceSegments; i++) {
        const xPos = startX + i * effectiveLength;
        
        // Skip if outside boundary
        if (xPos > endX) continue;
        
        // Skip if this position is where the gateway should be
        // More precise gateway check with improved logic
        if (xPos >= gateStartX - 5 && xPos <= gateEndX + 5 && Math.abs(startZ - gateZ) < gateDepth) continue;
        
        // Skip if this is a known problematic position
        let skipThisPosition = false;
        for (const pos of excludePositions) {
            if (Math.abs(xPos - pos.x) < fenceLength && Math.abs(startZ - pos.z) < fenceLength) {
                skipThisPosition = true;
                break;
            }
        }
        if (skipThisPosition) continue;
        
        fencePositions.push({
            position: new THREE.Vector3(xPos, fenceBaseHeight, startZ),
            rotation: new THREE.Euler(0, 0, 0) // facing along +Z
        });
    }
    
    // Right edge (X fixed at maximum, Z varies)
    for (let i = 0; i <= fenceSegments; i++) {
        const zPos = startZ + i * effectiveLength;
        
        // Skip if outside boundary
        if (zPos > endZ) continue;
        
        fencePositions.push({
            position: new THREE.Vector3(endX, fenceBaseHeight, zPos),
            rotation: new THREE.Euler(0, Math.PI / 2, 0) // rotate to face +X
        });
    }
    
    // Top edge (Z fixed at maximum, X varies)
    for (let i = 0; i <= fenceSegments; i++) {
        const xPos = endX - i * effectiveLength;
        
        // Skip if outside boundary
        if (xPos < startX) continue;
        
        fencePositions.push({
            position: new THREE.Vector3(xPos, fenceBaseHeight, endZ),
            rotation: new THREE.Euler(0, Math.PI, 0) // face -Z
        });
    }
    
    // Left edge (X fixed at minimum, Z varies)
    for (let i = 0; i <= fenceSegments; i++) {
        const zPos = endZ - i * effectiveLength;
        
        // Skip if outside boundary
        if (zPos < startZ) continue;
        
        fencePositions.push({
            position: new THREE.Vector3(startX, fenceBaseHeight, zPos),
            rotation: new THREE.Euler(0, -Math.PI / 2, 0) // face -X
        });
    }
    
    // Filter out any fence positions near problematic areas
    const filteredPositions = [];
    const exclusionDistance = fenceLength * 1.5; // Increased exclusion distance
    
    for (const fencePos of fencePositions) {
        let shouldExclude = false;
        
        // Check against all problematic positions
        for (const pos of excludePositions) {
            const dx = fencePos.position.x - pos.x;
            const dz = fencePos.position.z - pos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < exclusionDistance) {
                shouldExclude = true;
                break;
            }
        }
        
        // Also exclude any fence in the expanded gate area
        if (fencePos.position.x >= gateStartX - 5 && 
            fencePos.position.x <= gateEndX + 5 && 
            Math.abs(fencePos.position.z - gateZ) < gateDepth) {
            shouldExclude = true;
        }
        
        if (!shouldExclude) {
            filteredPositions.push(fencePos);
        }
    }
    
    // Add single 45-degree rotated fence at each corner
    const cornerOffset = 10; // Offset from the exact corner to position the 45-degree fence
    
    // Bottom-left corner (SW)
    filteredPositions.push({
        position: new THREE.Vector3(startX + cornerOffset - 7, fenceBaseHeight, startZ + cornerOffset - 7),
        rotation: new THREE.Euler(0, Math.PI / 4, 0) // 45 degrees
    });
    
    // Bottom-right corner (SE)
    filteredPositions.push({
        position: new THREE.Vector3(endX - cornerOffset + 7, fenceBaseHeight, startZ + cornerOffset - 7),
        rotation: new THREE.Euler(0, -Math.PI / 4, 0) // -45 degrees
    });
    
    // Top-right corner (NE)
    filteredPositions.push({
        position: new THREE.Vector3(endX - cornerOffset + 7, fenceBaseHeight, endZ - cornerOffset + 7),
        rotation: new THREE.Euler(0, -Math.PI * 3/4, 0) // -135 degrees
    });
    
    // Top-left corner (NW)
    filteredPositions.push({
        position: new THREE.Vector3(startX + cornerOffset - 7, fenceBaseHeight, endZ - cornerOffset + 7),
        rotation: new THREE.Euler(0, Math.PI * 3/4, 0) // 135 degrees
    });
    
    // Add gate posts on both sides of the entrance - positioned at the new gate bounds
    filteredPositions.push({
        position: new THREE.Vector3(gateStartX - 5, fenceBaseHeight, gateZ),
        rotation: new THREE.Euler(0, 0, 0) // facing along +Z
    });
    
    filteredPositions.push({
        position: new THREE.Vector3(gateEndX + 5, fenceBaseHeight, gateZ),
        rotation: new THREE.Euler(0, 0, 0) // facing along +Z
    });
    
    // // Add gate side fences - creating a proper entrance path
    // // Left side of gate (perpendicular to main fence)
    // filteredPositions.push({
    //     position: new THREE.Vector3(gateStartX + 7, fenceBaseHeight, gateZ - 9.5),
    //     rotation: new THREE.Euler(0, Math.PI / 2, 0) // perpendicular to entrance
    // });
    
    // // Right side of gate (perpendicular to main fence)
    // filteredPositions.push({
    //     position: new THREE.Vector3(gateEndX - 7, fenceBaseHeight, gateZ - 9.5),
    //     rotation: new THREE.Euler(0, -Math.PI / 2, 0) // perpendicular to entrance
    // });

    
    return filteredPositions;
}

/**
 * Create hedges using the loaded 3D model
 */
function createModelHedges(scene, hedgeModel, fencePositions, spacing, fenceHeight, fenceObjects) {
    // Determine the model's natural dimensions
    const bbox = new THREE.Box3().setFromObject(hedgeModel);
    const modelSize = new THREE.Vector3();
    bbox.getSize(modelSize);
    
    // Calculate the model's bottom position
    const modelBottom = bbox.min.y;
    
    // Significantly increase the scale of the hedges
    const scaleFactor = 1.5; // Increase this factor to make fences more visible
    
    // Calculate how much to lift the fence to make brick part visible
    const liftAmount = 4 // Increased lift to ensure fence is properly above ground

    for (const {position, rotation} of fencePositions) {
        // Clone the model for each fence segment
        const hedge = hedgeModel.clone();
        
        // Position the hedge and raise it by liftAmount to show brick base
        const newPosition = position.clone();
        newPosition.y = liftAmount; // Lift the fence to show brick part
        hedge.position.copy(newPosition);
        
        // Apply rotation
        hedge.rotation.copy(rotation);
        
        // Scale the hedge to match desired dimensions
        // Calculate scale factors based on spacing and desired height
        const scaleX = (spacing / modelSize.x) * scaleFactor;
        const scaleY = (fenceHeight / modelSize.y) * scaleFactor;
        const scaleZ = scaleX * 1.0; // Reduced from 1.5 to 1.0 to make fences less thick
        
        hedge.scale.set(scaleX, scaleY, scaleZ);
        
        // Add shadows to all meshes in the model
        hedge.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Ensure materials are properly rendered
                if (child.material) {
                    child.material.side = THREE.DoubleSide;
                    child.material.needsUpdate = true;
                }
                
                // Add fence identifier for raycasting
                child.userData.isFence = true;
                child.userData.type = 'hedge_fence';
            }
        });
        
        // Add user data for collision detection
        hedge.userData.isHedge = true;
        hedge.userData.type = 'hedge_fence';
        hedge.userData.isFence = true;
        
        // Create collision bounding box
        const boundingBox = new THREE.Box3().setFromObject(hedge);
        hedge.userData.boundingBox = boundingBox;
        
        // Add to scene
        scene.add(hedge);
        fenceObjects.push(hedge);
    }
}

/**
 * Create simple box hedges as fallback
 */
function createSimpleHedges(scene, fencePositions, spacing, fenceHeight, fenceDepth, fenceObjects) {
    // Use a more appropriate hedge color
    const hedgeGeometry = new THREE.BoxGeometry(spacing, fenceHeight * 2, fenceDepth * 3); // Double height, triple depth
    const hedgeMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x228B22, // Forest green
        side: THREE.DoubleSide
    });
    
    for (const {position, rotation} of fencePositions) {
        const hedge = new THREE.Mesh(hedgeGeometry, hedgeMaterial);
        
        hedge.position.copy(position);
        // Adjust the Y position to half the height to place it on the ground properly
        hedge.position.y = fenceHeight; // Set to half the height of the box
        hedge.rotation.copy(rotation);
        
        // Add shadows
        hedge.castShadow = true;
        hedge.receiveShadow = true;
        
        // Add user data for collision detection
        hedge.userData.isHedge = true;
        hedge.userData.type = 'hedge_fence';
        hedge.userData.isFence = true;
        
        // Create collision bounding box
        const boundingBox = new THREE.Box3().setFromObject(hedge);
        hedge.userData.boundingBox = boundingBox;
        
        scene.add(hedge);
        fenceObjects.push(hedge);
    }
}