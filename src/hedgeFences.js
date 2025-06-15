import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
        distance = 100,
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
                console.log("Loaded hedge fence model successfully");
                const hedgeModel = gltf.scene;
                
                // Create all fence segments using the loaded model
                createModelHedges(scene, hedgeModel, fencePositions, spacing, fenceHeight, fenceObjects);
                
                console.log(`Created ${fenceObjects.length} hedge fence segments from model`);
                resolve(fenceObjects);
            },
            // Progress callback
            (xhr) => {
                console.log(`Loading hedge fence model: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
            },
            // Error callback
            (error) => {
                console.error("Error loading hedge fence model:", error);
                console.log("Falling back to simple box hedges");
                
                // Create simple box hedges as fallback
                createSimpleHedges(scene, fencePositions, spacing, fenceHeight, 1, fenceObjects);
                
                console.log(`Created ${fenceObjects.length} simple hedge fence segments`);
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
    
    // Increase the spacing between fence segments
    const gapBetweenFences = 5; // Gap between fence segments in units
    const effectiveLength = fenceLength + gapBetweenFences;
    
    // Calculate fewer segments with gaps between them
    const fenceSegments = Math.floor(parkSize / effectiveLength);
    
    const startX = centerPoint.x - distance;
    const startZ = centerPoint.z - distance;
    
    // Use a consistent Y position value that elevates the fence above ground level
    const fenceBaseHeight = 10;
    
    // Bottom edge (Z fixed, X varies)
    for (let i = 0; i <= fenceSegments; i++) {
        // Position each fence with a gap between them
        const xPos = startX + i * effectiveLength;
        
        // Skip if we'd exceed the park boundary
        if (xPos > startX + parkSize) continue;
        
        fencePositions.push({
            position: new THREE.Vector3(xPos, fenceBaseHeight, startZ),
            rotation: new THREE.Euler(0, 0, 0) // facing along +Z
        });
    }
    
    // Right edge (X fixed, Z varies)
    for (let i = 1; i <= fenceSegments; i++) {
        const zPos = startZ + i * effectiveLength;
        
        // Skip if we'd exceed the park boundary
        if (zPos > startZ + parkSize) continue;
        
        fencePositions.push({
            position: new THREE.Vector3(startX + parkSize, fenceBaseHeight, zPos),
            rotation: new THREE.Euler(0, Math.PI / 2, 0) // rotate to face +X
        });
    }
    
    // Top edge (Z fixed, X decreases)
    for (let i = 1; i <= fenceSegments; i++) {
        const xPos = startX + parkSize - i * effectiveLength;
        
        // Skip if we'd go below the park's starting X
        if (xPos < startX) continue;
        
        fencePositions.push({
            position: new THREE.Vector3(xPos, fenceBaseHeight, startZ + parkSize),
            rotation: new THREE.Euler(0, Math.PI, 0) // face -Z
        });
    }
    
    // Left edge (X fixed, Z decreases)
    for (let i = 1; i < fenceSegments; i++) {
        const zPos = startZ + parkSize - i * effectiveLength;
        
        // Skip if we'd go below the park's starting Z
        if (zPos < startZ) continue;
        
        fencePositions.push({
            position: new THREE.Vector3(startX, fenceBaseHeight, zPos),
            rotation: new THREE.Euler(0, -Math.PI / 2, 0) // face -X
        });
    }
    
    return fencePositions;
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
            }
        });
        
        // Add user data for collision detection
        hedge.userData.isHedge = true;
        hedge.userData.type = 'hedge_fence';
        
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
        
        // Create collision bounding box
        const boundingBox = new THREE.Box3().setFromObject(hedge);
        hedge.userData.boundingBox = boundingBox;
        
        scene.add(hedge);
        fenceObjects.push(hedge);
    }
}
