import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Global variables to store tree objects
let allTreeObjects = [];

/**
 * Loads trees around the outside perimeter of the park
 * @param {THREE.Scene} scene - The scene to add trees to
 * @param {Object} options - Configuration options
 * @param {THREE.Vector3} options.centerPoint - Center point of the park (default: origin)
 * @param {Number} options.parkDistance - Distance from center to park edge (default: 150)
 * @param {Number} options.treeDistance - Distance from center to place trees (default: 200)
 * @param {Number} options.treeSpacing - Spacing between trees (default: 20)
 * @param {Number} options.treeScale - Scale of the trees (default: 2)
 * @param {String} options.modelPath - Path to the tree model (default: './tree.glb')
 * @returns {Promise<Array<THREE.Object3D>>} - Promise resolving to array of tree objects
 */
export function loadTrees(scene, options = {}) {
    const {
        centerPoint = new THREE.Vector3(0, 0, 0),
        parkDistance = 200,
        treeDistance = 200,
        treeSpacing = 100,
        treeScale = 0.7,
        modelPath = './quick_treeit_tree.glb'
    } = options;

    return new Promise((resolve) => {
        const treeObjects = [];
        const loader = new GLTFLoader();
        
        // Generate tree positions around the park
        const treePositions = generateTreePositions(centerPoint, parkDistance, treeDistance, treeSpacing);
        
        // Try to load the tree model
        loader.load(
            modelPath,
            (gltf) => {
                console.log("Loaded tree model successfully");
                const treeModel = gltf.scene;
                
                // Create all trees using the loaded model
                createModelTrees(scene, treeModel, treePositions, treeScale, treeObjects);
                
                // Store tree objects globally
                allTreeObjects = [...treeObjects];
                
                console.log(`Created ${treeObjects.length} trees from model`);
                resolve(treeObjects);
            },
            // Progress callback
            (xhr) => {
                console.log(`Loading tree model: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
            },
            // Error callback
            (error) => {
                console.error("Error loading tree model:", error);
                console.log("Falling back to simple tree geometry");
                
                // Create simple trees as fallback
                createSimpleTrees(scene, treePositions, treeScale, treeObjects);
                
                // Store tree objects globally
                allTreeObjects = [...treeObjects];
                
                console.log(`Created ${treeObjects.length} simple trees`);
                resolve(treeObjects);
            }
        );
    });
}

/**
 * Generate tree positions outside the park boundary
 */
function generateTreePositions(centerPoint, parkDistance, treeDistance, treeSpacing) {
    const treePositions = [];
    const minTreeDistance = parkDistance + 20; // Minimum distance from park edge
    const maxTreeDistance = treeDistance + 100; // Maximum distance for trees
    
    // Number of tree rings around the park
    const rings = Math.floor((maxTreeDistance - minTreeDistance) / 30);
    
    for (let ring = 0; ring < rings; ring++) {
        const currentDistance = minTreeDistance + ring * 30;
        const circumference = 2 * Math.PI * currentDistance;
        const treesInRing = Math.floor(circumference / treeSpacing);
        
        for (let i = 0; i < treesInRing; i++) {
            const angle = (i / treesInRing) * Math.PI * 2;
            
            // Add some randomness to position and distance
            const randomOffset = (Math.random() - 0.5) * 15;
            const randomDistanceOffset = (Math.random() - 0.5) * 20;
            const finalDistance = currentDistance + randomDistanceOffset;
            
            const x = centerPoint.x + Math.cos(angle) * finalDistance + randomOffset;
            const z = centerPoint.z + Math.sin(angle) * finalDistance + randomOffset;
            
            // Random rotation for natural look
            const rotation = Math.random() * Math.PI * 2;
            
            // Vary tree height slightly
            const scaleVariation = 0.7 + Math.random() * 0.6; // Scale between 0.7 and 1.3
            
            treePositions.push({
                position: new THREE.Vector3(x, 0, z),
                rotation: new THREE.Euler(0, rotation, 0),
                scale: scaleVariation
            });
        }
    }
    
    // Add some scattered trees for more natural look
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = minTreeDistance + Math.random() * (maxTreeDistance - minTreeDistance);
        
        const x = centerPoint.x + Math.cos(angle) * distance + (Math.random() - 0.5) * 40;
        const z = centerPoint.z + Math.sin(angle) * distance + (Math.random() - 0.5) * 40;
        
        // Make sure scattered trees are far enough from park
        const distanceFromCenter = Math.sqrt(x * x + z * z);
        if (distanceFromCenter > minTreeDistance) {
            treePositions.push({
                position: new THREE.Vector3(x, 0, z),
                rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
                scale: 0.8 + Math.random() * 0.4
            });
        }
    }
    
    return treePositions;
}

/**
 * Create trees using the loaded 3D model
 */
function createModelTrees(scene, treeModel, treePositions, baseScale, treeObjects) {
    // Determine the model's natural dimensions
    const bbox = new THREE.Box3().setFromObject(treeModel);
    const modelSize = new THREE.Vector3();
    bbox.getSize(modelSize);
    
    for (const {position, rotation, scale} of treePositions) {
        // Clone the model for each tree
        const tree = treeModel.clone();
        
        // Position the tree
        tree.position.copy(position);
        
        // Apply rotation
        tree.rotation.copy(rotation);
        
        // Scale the tree
        const finalScale = baseScale * scale;
        tree.scale.set(finalScale, finalScale, finalScale);
        
        // Add shadows to all meshes in the model
        tree.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Ensure materials are properly rendered
                if (child.material) {
                    child.material.side = THREE.DoubleSide;
                    child.material.needsUpdate = true;
                }
                
                // Add tree identifier
                child.userData.isTree = true;
                child.userData.type = 'tree';
            }
        });
        
        // Add user data
        tree.userData.isTree = true;
        tree.userData.type = 'tree';
        
        // Add to scene
        scene.add(tree);
        treeObjects.push(tree);
    }
}

/**
 * Create simple trees as fallback
 */
function createSimpleTrees(scene, treePositions, baseScale, treeObjects) {
    // Tree trunk geometry and material
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 4, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown
    
    // Tree foliage geometry and material
    const foliageGeometry = new THREE.SphereGeometry(3, 8, 6);
    const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // Forest green
    
    for (const {position, rotation, scale} of treePositions) {
        // Create tree group
        const treeGroup = new THREE.Group();
        
        // Create trunk
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2; // Half the trunk height
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        
        // Create foliage
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 5; // Top of trunk + radius
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        
        // Add to tree group
        treeGroup.add(trunk);
        treeGroup.add(foliage);
        
        // Position and rotate the tree group
        treeGroup.position.copy(position);
        treeGroup.rotation.copy(rotation);
        
        // Scale the tree
        const finalScale = baseScale * scale;
        treeGroup.scale.set(finalScale, finalScale, finalScale);
        
        // Add user data
        treeGroup.userData.isTree = true;
        treeGroup.userData.type = 'tree';
        trunk.userData.isTree = true;
        trunk.userData.type = 'tree';
        foliage.userData.isTree = true;
        foliage.userData.type = 'tree';
        
        // Add to scene
        scene.add(treeGroup);
        treeObjects.push(treeGroup);
    }
}

/**
 * Get all tree objects for collision detection or other purposes
 * @returns {Array<THREE.Object3D>} - Array of all tree objects
 */
export function getAllTrees() {
    return allTreeObjects;
}

/**
 * Remove all trees from the scene
 * @param {THREE.Scene} scene - The scene to remove trees from
 */
export function removeAllTrees(scene) {
    allTreeObjects.forEach(tree => {
        scene.remove(tree);
        
        // Dispose of geometries and materials to free memory
        tree.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    });
    
    allTreeObjects = [];
    console.log("All trees removed from scene");
}
