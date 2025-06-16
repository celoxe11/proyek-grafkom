import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Add a global variable to store the mascot reference
let mascotObject = null;
let mascotInitialPosition = null;
let followingPlayer = true; // Start with following enabled by default
let playerReference = null;
let ticketBoothBoundingBox = null; // Add a variable to store the ticket booth's bounding box

/**
 * Loads a ticket booth model and adds it to the scene
 * @param {THREE.Scene} scene - The scene to add the ticket booth to
 * @param {Object} options - Configuration options
 * @param {THREE.Vector3} options.position - Position of the ticket booth (default: {x: 0, y: 0, z: 0})
 * @param {Number} options.scale - Scale of the ticket booth (default: 1)
 * @param {String} options.modelPath - Path to the model file (default: 'models/ticketBooth.glb')
 * @returns {Promise<THREE.Object3D>} - Promise resolving to the ticket booth object
 */
function loadTicketBooth(scene, options = {}) {
    const {
        position = new THREE.Vector3(0, 0, 0),
        scale = 5,
        modelPath = './ticket_booth.glb',
        mascotModelPath = './cute_alien_character.glb',
        rotation = new THREE.Euler(0, 0, 0)
    } = options;

    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        
        // First load the ticket booth
        loader.load(
            modelPath,
            (gltf) => {
                const ticketBooth = gltf.scene;
                
                // Set position
                ticketBooth.position.copy(position);
                
                // Set scale
                ticketBooth.scale.set(scale, scale, scale);
                
                // Set rotation - properly handle Euler or Vector3
                if (rotation instanceof THREE.Euler) {
                    ticketBooth.rotation.copy(rotation);
                } else {
                    ticketBooth.rotation.set(
                        rotation.x || 0,
                        rotation.y || 0,
                        rotation.z || 0
                    );
                }
                
                // Add shadows and prepare bounding box geometry
                const boothSize = new THREE.Vector3(4, 8, 4); // Approximate size of the booth
                ticketBooth.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // Add user data for collision detection
                        child.userData.isTicketBooth = true;
                    }
                });
                
                // Create a bounding box for collision detection
                // Adjust the size to match your model's dimensions
                const boothBoundingBox = new THREE.Box3().setFromObject(ticketBooth);
                
                // Store bounding box for collision detection
                ticketBoothBoundingBox = boothBoundingBox;
                
                // Store reference to the booth for later use
                ticketBooth.userData.type = 'ticket_booth';
                ticketBooth.userData.boundingBox = boothBoundingBox;
                
                // Add to scene
                scene.add(ticketBooth);
                
                // Now load the mascot after the booth is loaded
                loader.load(
                    mascotModelPath,
                    (mascotGltf) => {
                        const mascot = mascotGltf.scene;
                        
                        // Position the mascot relative to the ticket booth
                        mascot.position.set(
                            position.x,  // Same x as booth
                            position.y + 7,  // Elevated a bit from the booth's base
                            position.z - 0.5  // Slightly forward from booth center
                        );
                        
                        // Store the initial position for reference
                        mascotInitialPosition = mascot.position.clone();
                        
                        // Scale the mascot relative to the booth
                        const mascotScale = scale * 1.5;
                        mascot.scale.set(mascotScale, mascotScale, mascotScale);
                        
                        // Add shadows
                        mascot.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                // Make sure the mascot is not hidden by the booth
                                child.material.depthTest = true;
                                child.material.transparent = true;
                                child.renderOrder = 1; // Render after the booth
                            }
                        });
                        
                        // Store the mascot reference for following behavior
                        mascotObject = mascot;
                        
                        // Add to scene
                        scene.add(mascot);
                        
                        // Add a spot light to highlight the mascot
                        const spotLight = new THREE.SpotLight(0xffffff, 2);
                        spotLight.position.set(position.x, position.y + 10, position.z);
                        spotLight.target = mascot;
                        spotLight.angle = 0.3;
                        spotLight.penumbra = 0.2;
                        spotLight.castShadow = true;
                        scene.add(spotLight);
                    },
                    undefined,
                    (error) => {
                        console.error('Error loading mascot model:', error);
                    }
                );
                
                // Return the ticket booth object
                resolve(ticketBooth);
            },
            // Progress callback
            (xhr) => {
                // Removed console.log for loading progress
            },
            // Error callback
            (error) => {
                console.error('Error loading ticket booth:', error);
                reject(error);
            }
        );
    });
}

/**
 * Updates the mascot to always look at the player
 * @param {THREE.Vector3} playerPosition - The current position of the player
 */
function updateMascotPosition(playerPosition) {
    if (!mascotObject || !followingPlayer) return;
    
    // Make mascot look at player without moving from its spot
    // Calculate direction vector to player but keep Y level consistent
    const lookPosition = new THREE.Vector3(
        playerPosition.x,
        mascotObject.position.y, // Keep vertical position the same
        playerPosition.z
    );
    
    // Make mascot look at player
    mascotObject.lookAt(lookPosition);
    
    // Add a slight bobbing motion to make the mascot feel more alive
    const time = Date.now() * 0.001; // Get time in seconds
    mascotObject.position.y = mascotInitialPosition.y + Math.sin(time * 1.5) * 0.2; // Gentle bobbing
}

/**
 * Toggles whether the mascot follows the player direction
 * @param {boolean} shouldFollow - Whether the mascot should look at the player
 * @param {THREE.Object3D} player - Reference to the player object (camera holder)
 */
function setMascotFollowing(shouldFollow, player) {
    followingPlayer = shouldFollow;
    playerReference = player;
    
    // Reset mascot rotation if not following
    if (!shouldFollow && mascotObject) {
        // Reset rotation to default facing direction
        mascotObject.rotation.set(0, 0, 0);
    }
}

/**
 * Returns the mascot to its initial position near the ticket booth
 * Not used for direction tracking, but kept for API compatibility
 */
function returnMascotToBase() {
    return true;
}

/**
 * Checks if the player's position collides with the ticket booth
 * @param {THREE.Vector3} playerPosition - Player's position
 * @param {Number} playerRadius - Player's collision radius
 * @returns {Boolean} - True if collision detected, false otherwise
 */
function checkTicketBoothCollision(playerPosition, playerRadius = 1) {
    if (!ticketBoothBoundingBox) return false;
    
    // Create a sphere representing the player
    const playerSphere = new THREE.Sphere(playerPosition, playerRadius);
    
    // Check for intersection between player sphere and booth bounding box
    return ticketBoothBoundingBox.intersectsSphere(playerSphere);
}

/**
 * Checks if the player is looking at the mascot
 * @param {THREE.Vector3} playerPosition - Player's position
 * @param {THREE.Vector3} playerDirection - Direction the player is looking
 * @param {Number} maxDistance - Maximum distance to check
 * @returns {Boolean} - True if player is looking at mascot
 */
function isLookingAtMascot(playerPosition, playerDirection, maxDistance = 15) {
    if (!mascotObject) return false;
    
    // Create a raycaster from the player's position in the direction they're looking
    const raycaster = new THREE.Raycaster(playerPosition, playerDirection.normalize());
    
    // Get the mascot's bounding sphere to use for intersection tests
    const mascotBoundingSphere = new THREE.Box3().setFromObject(mascotObject).getBoundingSphere(new THREE.Sphere());
    
    // Check if the ray intersects with the mascot's bounding sphere
    const intersectionPoint = new THREE.Vector3();
    const result = raycaster.ray.intersectSphere(mascotBoundingSphere, intersectionPoint);
    
    // If there's an intersection and it's within the max distance
    if (result && playerPosition.distanceTo(intersectionPoint) <= maxDistance) {
        return true;
    }
    
    return false;
}

/**
 * Gets random dialog from the mascot
 * @returns {String} - A random dialog message
 */
function getMascotDialog() {
    const dialogs = [
        "Welcome to our amusement park! I'm the mascot, nice to meet you!",
        "Hey there! Looking for some fun? Try our amazing rides!",
        "Don't forget to check out our special attractions!",
        "Having fun? That's what we're here for!",
        "The weather is perfect for amusement park adventures!",
        "Make sure to try our delicious snacks at the food stands!",
        "Say cheese! Taking pictures is allowed everywhere in the park!",
        "Need directions? Just ask me anytime!",
        "Our park is celebrating its 10th anniversary this year!",
        "Remember to stay hydrated and enjoy your time here!"
    ];
    
    return dialogs[Math.floor(Math.random() * dialogs.length)];
}

export { 
    loadTicketBooth, 
    updateMascotPosition, 
    setMascotFollowing, 
    returnMascotToBase, 
    checkTicketBoothCollision,
    ticketBoothBoundingBox,
    isLookingAtMascot,
    getMascotDialog,
    mascotObject
};