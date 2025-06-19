import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { ModelLoader } from "./modelLoader.js";
import { CelestialSystem } from "./celestial.js";
import { Terrain } from "./terrain.js";
import { PlayerControls } from "./controls.js";
import { ObjectPlacer } from "./objectPlacer.js";
import { InteractionManager } from "./interactionManager.js"; // Import InteractionManager
import {
  loadTicketBooth,
  updateMascotPosition,
  setMascotFollowing,
  returnMascotToBase,
  checkTicketBoothCollision,
  ticketBoothBoundingBox,
  isLookingAtMascot,
  getMascotDialog,
  mascotObject,
} from "./ticketBooth.js";
import {
  loadHedgeFences,
  checkFenceCollisionMultiDirection,
} from "./hedgeFences.js";
import { loadTrees } from "./trees.js";
import {
  loadNpcModel,
  moveNpcToTicketBooth,
  initializeNPCSystem,
  getNPCStats,
  getSittingPositionStatus,
} from "./npc.js";
import {
  loadPicnicTableGroup,
  checkPicnicTableCollision,
} from "./picnicTables.js";
import {
  loadParkCornerStreetLights,
  updateStreetLightsByTime,
  forceStreetLightsOn,
  toggleStreetLights,
  resetStreetLightOverride,
  isStreetLightOverridden,
  getAllLightObjects,
} from "./streetLight.js";
import { loadFerrisWheel, checkFerrisWheelCollision } from "./ferrisWheel.js";

function showWarning(message) {
  const warningContainer = document.getElementById("warning-container");

  const warning = document.createElement("div");
  warning.textContent = message;
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

export function initGame() {
  // Clear any existing content
  const appElement = document.querySelector("#app");
  if (appElement) {
    appElement.innerHTML = "";
  }

  // Create new game scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#87CEEB"); // Back to original sky blue

  const stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

  const warningContainer = document.createElement("div");
  warningContainer.id = "warning-container";
  warningContainer.style.cssText = `
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2000;
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
    `;
  document.body.appendChild(warningContainer);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    20000
  );
  camera.position.set(0, 0, 0);

  const cameraHolder = new THREE.Object3D();
  cameraHolder.position.set(4, 7, 170);
  cameraHolder.add(camera);
  scene.add(cameraHolder);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  // Configure renderer for better lighting but with performance in mind
  renderer.physicallyCorrectLights = false;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.0;

  document.querySelector("#app").appendChild(renderer.domElement);

  // Calculate sidebar width once
  const sidebarWidth = Math.min(300, window.innerWidth / 6); // Cap at 300px or 1/6 of window width

  // Update stats panel position and style
  stats.dom.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 240px !important; // Position it next to the map
    `;

  // Create left sidebar with pull tab
  const sidebar = document.createElement("div");
  sidebar.id = "game-sidebar";
  sidebar.style.cssText = `
      position: fixed;
      top: 0;
      left: -${sidebarWidth}px;
      width: ${sidebarWidth}px;
      height: 100vh;
      background: linear-gradient(135deg, rgba(26, 71, 42, 0.9), rgba(40, 114, 51, 0.95));
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: 5px 0 15px rgba(0, 0, 0, 0.2);
      padding: 20px;
      color: white;
      font-family: 'Poppins', sans-serif;
      z-index: 1000;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      gap: 15px;
      transition: all 0.3s ease;
      opacity: 0;
      visibility: hidden;
      overflow-y: auto;
    `;

  // Create map panel with smaller dimensions
  const mapPanel = document.createElement("div");
  mapPanel.id = "game-map";
  mapPanel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 200px;
      height: 200px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 8px;
      padding: 8px;
      color: white;
      z-index: 1000;
      border: 1px solid rgba(255, 255, 255, 0.3);
      backdrop-filter: blur(5px);
    `;

  // Create canvas for map
  const mapCanvas = document.createElement("canvas");
  mapCanvas.width = 200;
  mapCanvas.height = 200;
  mapCanvas.style.cssText = `
      background: #1a1a1a;
      border-radius: 4px;
    `;
  mapPanel.appendChild(mapCanvas);

  // Map drawing context
  const mapCtx = mapCanvas.getContext("2d");

  // Add map panel to document
  document.body.appendChild(mapPanel);

  // Keep only this single sidebar content definition and remove all others
  const sidebarContent = `
      <div class="sidebar-section">
        <div class="sidebar-header">
          <h2>⏰ Time & Location</h2>
        </div>
        <div class="sidebar-content status-container">
          <div id="time-indicator">Time: Day</div>
          <div id="position-indicator">Position: X: 0, Y: 0, Z: 0</div>
          <div id="npc-counter">NPCs: 0/7</div>
          <div id="light-override-indicator" style="color: #ffaa00; display: none;">🔒 Lights Override: ON</div>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-header">
          <h2>🎮 Controls</h2>
        </div>
        <div class="sidebar-content">
          <div class="control-item">
            <span class="key">WASD</span>
            <span class="action">Move</span>
          </div>
          <div class="control-item">
            <span class="key">MOUSE</span>
            <span class="action">Look around</span>
          </div>
          <div class="control-item">
            <span class="key">SPACE</span>
            <span class="action">Jump</span>
          </div>
          <div class="control-item">
            <span class="key">ESC</span>
            <span class="action">Menu</span>
          </div>
          <div class="control-item">
            <span class="key">H</span>
            <span class="action">Toggle Shadow Helper</span>
          </div>
          <div class="control-item">
            <span class="key">L</span>
            <span class="action">Toggle Street Lights</span>
          </div>
          <div class="control-item">
            <span class="key">R</span>
            <span class="action">Reset Light Override</span>
          </div>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-header">
          <h2>🎡 Placement</h2>
        </div>
        <div class="sidebar-content">
          <div class="control-item">
            <span class="key">1</span>
            <span class="action">Place Merry-go-round</span>
          </div>
          <div class="control-item">
            <span class="key">ENTER</span>
            <span class="action">Confirm place</span>
          </div>
          <div class="control-item">
            <span class="key">E</span>
            <span class="action">Interact</span>
          </div>
        </div>
      </div>
    `;

  // Update the sidebar styles
  const sidebarStyles = document.createElement("style");
  sidebarStyles.textContent = `
      #game-sidebar {
        padding: 15px;
        overflow-y: auto;
        max-height: calc(100vh - 30px);
      }

      .sidebar-section {
        background: rgba(0, 0, 0, 0.4);
        border-radius: 12px;
        margin-bottom: 15px;
        border: 1px solid rgba(0, 255, 136, 0.2);
        overflow: hidden;
      }

      .sidebar-header {
        padding: 12px 15px;
        background: rgba(0, 255, 136, 0.1);
        border-bottom: 1px solid rgba(0, 255, 136, 0.2);
      }

      .sidebar-header h2 {
        margin: 0;
        font-size: 1.1em;
        color: #00ff88;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sidebar-content {
        padding: 12px 15px;
      }

      .status-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .control-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .control-item:last-child {
        border-bottom: none;
      }

      .key {
        background: rgba(0, 255, 136, 0.15);
        padding: 4px 12px;
        border-radius: 4px;
        color: #00ff88;
        font-weight: bold;
        min-width: 50px;
        text-align: center;
        border: 1px solid rgba(0, 255, 136, 0.3);
      }

      .action {
        color: #ffffff;
        text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
      }

      #time-indicator, #position-indicator {
        margin-bottom: 5px;
        color: #00ff88;
      }

      #time-indicator:last-child, #position-indicator:last-child {
        margin-bottom: 0;
      }

      .stats {
        background: rgba(0, 0, 0, 0.7) !important;
        padding: 5px !important;
        border-radius: 8px !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        backdrop-filter: blur(5px) !important;
      }
    `;

  // Remove all duplicate sidebar content definitions and appendChild calls
  document.head.appendChild(sidebarStyles);
  sidebar.innerHTML = sidebarContent;
  document.body.appendChild(sidebar);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault(); // prevent focus shifting
      const isVisible = sidebar.style.left === "0px";
      sidebar.style.left = isVisible ? `-${sidebar.offsetWidth}px` : "0px";
      sidebar.style.opacity = isVisible ? "0" : "1";
      sidebar.style.visibility = isVisible ? "hidden" : "visible";
    }
  });

  // Update window resize handler
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    sidebar.style.width = `${window.innerWidth / 6}px`;
  });

  // Pass renderer.domElement to PlayerControls for proper pointer lock
  const celestialSystem = new CelestialSystem(scene);
  const terrain = new Terrain(scene);
  const modelLoader = new ModelLoader(scene);
  const playerControls = new PlayerControls(
    camera,
    cameraHolder,
    modelLoader,
    renderer.domElement
  );

  // Add after creating modelLoader
  const interactionManager = new InteractionManager(camera, scene);
  modelLoader.interactionManager = interactionManager;

  // Create hemisphere light with variable intensity for day/night cycle
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
  scene.add(hemisphereLight);

  // Update the directional light settings for better shadows
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(20, 100, 10);
  directionalLight.castShadow = true;

  // Improve shadow map settings to cover the entire park area
  directionalLight.shadow.mapSize.width = 4096; // Increased for better quality
  directionalLight.shadow.mapSize.height = 4096; // Increased for better quality
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 1000;
  // Increase shadow area to cover entire park (300x300 units)
  directionalLight.shadow.camera.left = -200;
  directionalLight.shadow.camera.right = 200;
  directionalLight.shadow.camera.top = 200;
  directionalLight.shadow.camera.bottom = -200;
  directionalLight.shadow.bias = -0.001;
  directionalLight.shadow.normalBias = 0.02;

  // Add a helper to visualize the shadow camera (enable for debugging)
  const helper = new THREE.CameraHelper(directionalLight.shadow.camera);
  helper.visible = false; // Start hidden
  scene.add(helper);

  scene.add(directionalLight);

  // // Test box for shadow visibility - positioned above ground
  // const box = new THREE.Mesh(
  //   new THREE.BoxGeometry(10, 10, 10),
  //   new THREE.MeshStandardMaterial({ color: 0x00ff00 })
  // );
  // box.position.set(20, 5, 20); // Position above ground
  // box.castShadow = true;
  // box.receiveShadow = true;
  // scene.add(box);

  // Add a ground plane to receive shadows
  const groundGeometry = new THREE.PlaneGeometry(400, 400);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x228b22,
    transparent: true,
    opacity: 0.5,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.position.y = -0.1; // Slightly below terrain
  ground.receiveShadow = true;
  scene.add(ground);

  // Remove model-related variables
  const positionIndicator = document.createElement("div");
  positionIndicator.id = "position-indicator";
  positionIndicator.className = "indicator";
  document.body.appendChild(positionIndicator);

  terrain.updateTextureSettings(renderer);

  // Add variable to store ferris wheel mixer
  let ferrisWheelMixer = null;

  // Remove loadModels function
  async function loadModels() {
    // Load ticket booth with a larger scale and rotation
    loadTicketBooth(scene, {
      position: new THREE.Vector3(35, 0, 137.9),
      scale: 5,
      rotation: new THREE.Euler(0, Math.PI, 0),
    }).then((ticketBoothObject) => {
      console.log("Ticket booth loaded!", ticketBoothObject);

      // Enable mascot direction following by default
      setMascotFollowing(true, cameraHolder);
    });

    // Load hedge fences around the park perimeter with adjusted parameters
    loadHedgeFences(scene, {
      centerPoint: new THREE.Vector3(0, 0, 0), // Center of the park
      distance: 150, // 100 units from center to edge (total park size is 200x200)
      fenceHeight: 10, // Height of the fences
      spacing: 15, // Increased spacing between fence segments from 10 to 15
      modelPath: "./simple_brick_fence.glb", // Specify the model path
    })
      .then((hedgeFences) => {
        console.log(`Loaded ${hedgeFences.length} hedge fence segments`);

        // Add hedge fences to collision objects - using built-in handling
        hedgeFences.forEach((fence) => {
          // We don't need to register these with the model loader,
          // they will work through the scene traversal
        });
      })
      .catch((error) => {
        console.error("Failed to load hedge fences:", error);
      });

    // Load trees outside the park
    loadTrees(scene, {
      centerPoint: new THREE.Vector3(0, 0, 0), // Center of the park
      parkDistance: 200, // Distance to park edge (should match fence distance)
      treeDistance: 200, // Distance from center to start placing trees
      treeSpacing: 150, // Space between trees
      treeScale: 0.7, // Scale of trees
      modelPath: "./quick_treeit_tree.glb", // Path to tree model (you can change this)
    })
      .then((trees) => {
        console.log(`Loaded ${trees.length} trees outside the park`);
      })
      .catch((error) => {
        console.error("Failed to load trees:", error);
      });

    // Load picnic tables - a group on the left side
    loadPicnicTableGroup(scene, {
      basePosition: new THREE.Vector3(-36.3, 0, 128.6),
      count: 3,
      spacing: 30,
      direction: "left",
    })
      .then((picnicTables) => {
        console.log(
          `Loaded ${picnicTables.length} picnic tables on the left side`
        );
      })
      .catch((error) => {
        console.error("Failed to load picnic tables:", error);
      });

    // Replace the old single NPC loading with NPC system initialization
    // Initialize NPC system (this will spawn the first NPC and manage subsequent spawns)
    initializeNPCSystem(scene, celestialSystem); // Pass celestial system reference

    loadParkCornerStreetLights(scene, {
      parkSize: 150, // Distance from center to corner
      scale: 3,
      modelPath: "./street_light.glb", // Path to street light model
      lightIntensity: 25, // Higher initial intensity
      lightDistance: 100, // Increased distance
      debugLightSphere: true, // Enable debug spheres
    })
      .then((streetLights) => {
        console.log(
          `🎯 Street lights loading completed: ${streetLights.length} lights`
        );
        // Initialize lights based on current game time after loading
        setTimeout(() => {
          console.log("🔄 Initializing street lights based on game time...");
          import("./streetLight.js").then(({ updateStreetLightsByTime }) => {
            // Get current hour from celestial system
            updateStreetLightsByTime(6); // Start at 6 AM (lights should be OFF)
          });
        }, 1000);
      })
      .catch((error) => {
        console.error("❌ Failed to load street lights:", error);
      });

    // Load the ferris wheel model
    loadFerrisWheel(scene, {
      position: new THREE.Vector3(4, -120, -100),
      scale: 5,
      rotation: new THREE.Euler(0, Math.PI / 2, 0),
    })
      .then(({ object, mixer }) => {
        console.log("Ferris wheel loaded!", object);
        ferrisWheelMixer = mixer; // Store the mixer for animation updates
        if (mixer) {
          console.log("Ferris wheel animation mixer ready");
        }
      })
      .catch((error) => {
        console.error("Failed to load ferris wheel:", error);
      });
  }

  loadModels();
  modelLoader.toggleBoundingBoxes();

  // Remove merry-go-round variables
  const clock = new THREE.Clock();

  // Helper for bounding box
  const playerCollider = new THREE.Box3();
  const seatCollider = new THREE.Box3();

  // Add animation style before creating warning box
  const style = document.createElement("style");
  style.textContent = `
      @keyframes flash {
        0% { transform: translate(-50%, -50%) scale(1); background-color: rgba(255, 0, 0, 0.9); }
        50% { transform: translate(-50%, -50%) scale(1.1); background-color: rgba(255, 0, 0, 0.7); }
        100% { transform: translate(-50%, -50%) scale(1); background-color: rgba(255, 0, 0, 0.9); }
      }
    `;
  document.head.appendChild(style);

  // Update warning box style
  const warningBox = document.createElement("div");
  warningBox.id = "collision-warning";
  warningBox.style.cssText = `
      position: fixed;
      top: 20%;  // Move higher up on screen
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(255, 0, 0, 0.9);  // More opaque red
      color: white;
      padding: 15px 30px;
      border-radius: 8px;
      display: none;
      z-index: 1000;
      font-size: 18px;  // Larger text
      font-weight: bold;  // Bold text
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);  // Text shadow for better visibility
      border: 2px solid white;  // White border
      box-shadow: 0 0 10px rgba(0,0,0,0.5);  // Box shadow
    `;
  // Modify warning box text
  warningBox.textContent = ""; // We'll update this dynamically
  document.body.appendChild(warningBox);

  // Create ObjectPlacer instance after scene setup
  const objectPlacer = new ObjectPlacer(
    scene,
    camera,
    cameraHolder,
    modelLoader
  );

  document.body.appendChild(sidebar);
  document.body.appendChild(mapPanel);

  // Create interaction prompt for mascot
  const interactionPrompt = document.createElement("div");
  interactionPrompt.id = "interaction-prompt";
  interactionPrompt.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(255, 255, 255, 0.8);
      color: #333;
      padding: 8px 15px;
      border-radius: 20px;
      display: none;
      z-index: 1000;
      font-size: 16px;
      font-weight: bold;
      box-shadow: 0 0 10px rgba(0,0,0,0.3);
  `;
  interactionPrompt.textContent = "Press F to talk";
  document.body.appendChild(interactionPrompt);

  // Create mascot dialog box
  const mascotDialog = document.createElement("div");
  mascotDialog.id = "mascot-dialog";
  mascotDialog.style.cssText = `
      position: fixed;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(255, 255, 255, 0.9);
      color: #333;
      padding: 15px 25px;
      border-radius: 10px;
      display: none;
      z-index: 1000;
      font-size: 18px;
      max-width: 80%;
      box-shadow: 0 0 15px rgba(0,0,0,0.4);
      border: 2px solid #00aaff;
  `;
  document.body.appendChild(mascotDialog);

  // Variables to track mascot interaction state
  let isShowingMascotDialog = false;
  let mascotDialogTimeout = null;
  let followingPlayer = true; // Track if mascot is following the player, default to true

  // Create clock display under the map
  const clockDisplay = document.createElement("div");
  clockDisplay.id = "clock-display";
  clockDisplay.style.cssText = `
      position: fixed;
      top: 20px; // Position it below the map
      right: 20px;
      left: 20px;
      width: 200px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 8px;
      padding: 10px;
      color: white;
      z-index: 1000;
      border: 1px solid rgba(255, 255, 255, 0.3);
      backdrop-filter: blur(5px);
      display: flex;
      flex-direction: column;
      align-items: center;
      font-family: 'Poppins', sans-serif;
  `;

  // Create time display
  const timeText = document.createElement("div");
  timeText.id = "time-text";
  timeText.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #ffffff;
  `;
  timeText.textContent = "12:00";

  // Create period display (AM/PM and day/night)
  const periodText = document.createElement("div");
  periodText.id = "period-text";
  periodText.style.cssText = `
      font-size: 16px;
      color: #98ff98;
  `;
  periodText.textContent = "AM - Day";

  // Add elements to clock display
  clockDisplay.appendChild(timeText);
  clockDisplay.appendChild(periodText);
  document.body.appendChild(clockDisplay);

  // Update the animate function to include map drawing
  function updateMap() {
    mapCtx.fillStyle = "#1a1a1a";
    mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

    // Draw player position with adjusted scale
    const mapScale = 3; // Increased scale to match smaller map
    const centerX = mapCanvas.width / 2;
    const centerZ = mapCanvas.height / 2;

    // Draw player (white dot)
    mapCtx.fillStyle = "#ffffff";
    mapCtx.beginPath();
    mapCtx.arc(
      centerX + cameraHolder.position.x / mapScale,
      centerZ + cameraHolder.position.z / mapScale,
      3,
      0,
      Math.PI * 2
    );
    mapCtx.fill();

    // Draw player direction (white line)
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    mapCtx.strokeStyle = "#ffffff";
    mapCtx.beginPath();
    mapCtx.moveTo(
      centerX + cameraHolder.position.x / mapScale,
      centerZ + cameraHolder.position.z / mapScale
    );
    mapCtx.lineTo(
      centerX + cameraHolder.position.x / mapScale + direction.x * 10,
      centerZ + cameraHolder.position.z / mapScale + direction.z * 10
    );
    mapCtx.stroke();
  }

  // Modify the animate function
  function animate() {
    requestAnimationFrame(animate);
    stats.begin();

    const deltaTime = clock.getDelta();

    // Update ferris wheel animation if mixer exists
    if (ferrisWheelMixer) {
      ferrisWheelMixer.update(deltaTime);
    }

    // Store previous position for collision rollback
    const previousPosition = cameraHolder.position.clone();

    // Update player controls
    playerControls.update(deltaTime);
    modelLoader.updateBoundingBoxes();

    // Update mascot to follow the player
    updateMascotPosition(cameraHolder.position);

    // Update NPC counter in sidebar
    const npcStats = getNPCStats();
    const sittingStatus = getSittingPositionStatus();
    const npcCounter = document.getElementById("npc-counter");
    if (npcCounter) {
      const minutesUntilNext = Math.ceil(npcStats.nextSpawnIn / (60 * 1000));
      npcCounter.innerHTML = `
        NPCs: ${npcStats.currentCount}/${npcStats.maxCount}<br>
        <small>Seats: ${sittingStatus.occupied}/${sittingStatus.total} occupied</small>
      `;
      if (npcStats.currentCount < npcStats.maxCount) {
        npcCounter.innerHTML += `<br><small>(Next in ${minutesUntilNext}m)</small>`;
      }
    }

    // Get camera direction for mascot interaction
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    // Check if player is looking at mascot
    if (
      isLookingAtMascot(cameraHolder.position, cameraDirection) &&
      !isShowingMascotDialog
    ) {
      interactionPrompt.style.display = "block";
    } else {
      interactionPrompt.style.display = "none";
    }

    // Check for fence collision using raycasting
    const fenceCollision = checkFenceCollisionMultiDirection(
      cameraHolder.position,
      2.0
    );
    if (fenceCollision.collision) {
      // If collision detected, revert to previous position
      cameraHolder.position.copy(previousPosition);

      // Show warning
      // showWarning("⚠️ You can't walk through the fence! ⚠️");
    }

    // Check for ticket booth collision
    if (checkTicketBoothCollision(cameraHolder.position, 1.5)) {
      // If collision detected, revert to previous position
      cameraHolder.position.copy(previousPosition);

      // Show warning
      // showWarning("⚠️ You can't walk through the ticket booth! ⚠️");
    }

    // Check for ferris wheel collision
    const ferrisWheelCollision = checkFerrisWheelCollision(
      cameraHolder.position,
      1.5
    );
    if (ferrisWheelCollision.collision) {
      // If collision detected, revert to previous position
      cameraHolder.position.copy(previousPosition);
      
      // Show warning
      // showWarning("⚠️ You can't walk through the ferris wheel! ⚠️");
    }

    // Check for picnic table collision
    const picnicTableCollision = checkPicnicTableCollision(
      cameraHolder.position,
      1.0
    );
    if (picnicTableCollision.collision) {
      // If collision detected, revert to previous position
      cameraHolder.position.copy(previousPosition);

      // Optionally show warning
      // showWarning("⚠️ You can't walk through the picnic table! ⚠️");
    }

    // Check player collisions with other objects
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      cameraHolder.position.clone().add(new THREE.Vector3(0, 2.25, 0)),
      new THREE.Vector3(1, 4.5, 1)
    );

    const collisionResult = modelLoader.checkCollision(playerBox);
    if (collisionResult.collision) {
      showWarning(`⚠️ Collision with ${collisionResult.objectName}! ⚠️`);
      playerControls.rollbackPosition();
    }

    // Update celestial system and get time data
    const timeData = celestialSystem.update(camera, directionalLight);

    // Control hemisphere light based on time of day
    if (timeData.isDaytime) {
      hemisphereLight.intensity = 1.0; // Full ambient light during day
    } else {
      hemisphereLight.intensity = 0.2; // Some ambient light at night for better visibility
    }

    // Remove the manual shadow camera positioning - let celestial system handle it
    // The celestial system now positions the directional light to follow sun/moon

    // Update clock display
    if (timeText && periodText) {
      timeText.textContent = timeData.timeString;
      periodText.textContent = `${timeData.period} - ${
        timeData.isDaytime ? "Day" : "Night"
      }`;

      // Update colors based on time of day
      if (timeData.isDaytime) {
        timeText.style.color = "#ffffff";
        periodText.style.color = "#98ff98";
      } else {
        timeText.style.color = "#aaccff";
        periodText.style.color = "#88aaff";
      }
    }

    const position = cameraHolder.position;
    positionIndicator.textContent = `Position: X: ${position.x.toFixed(
      1
    )}, Y: ${position.y.toFixed(1)}, Z: ${position.z.toFixed(1)}`;

    updateMap(); // Add this line before renderer.render

    // Update object placer
    if (objectPlacer && objectPlacer.active) {
      objectPlacer.updatePreviewTransform();

      // Check if preview object collides with ticket booth
      const isColliding = objectPlacer.checkPlacementCollision(
        ticketBoothBoundingBox
      );

      // Update preview material based on collision status
      objectPlacer.updatePreviewMaterial(isColliding);
    }

    // Update interactions
    const nearbyObject = interactionManager.update(cameraHolder.position);

    // Update object animations
    scene.traverse((object) => {
      if (
        object.userData.type === "merry-go-round" &&
        object.userData.isSpinning
      ) {
        object.rotation.y += object.userData.spinSpeed;
      }
    });

    // Handle 'E' key press for interactions
    document.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "e") {
        interactionManager.handleInteraction(nearbyObject);
      }
    });

    renderer.render(scene, camera);
    stats.end();
  }

  // Start dengan merry-go-round preview aktif
  // objectPlacer.startPlacement('merry_go_round.glb').then(() => {
  //   objectPlacer.active = true;
  //   const spotLight = new THREE.SpotLight(0xffffff, 1);
  //   spotLight.position.set(0, 10, 0);
  //   spotLight.target = objectPlacer.previewMesh || objectPlacer.debugBox;
  //   scene.add(spotLight);
  // });

  // Change the event listener for object placement
  document.addEventListener("keydown", async (event) => {
    switch (event.key) {
      case "Enter":
        if (objectPlacer?.active) {
          objectPlacer.confirmPlacement();
        }
        break;
      case "1":
        // Start placement mode
        if (objectPlacer) {
          await objectPlacer.startPlacement();
        }
        break;
      case "h":
      case "H":
        // Toggle shadow camera helper
        helper.visible = !helper.visible;
        console.log(`Shadow helper ${helper.visible ? "enabled" : "disabled"}`);
        break;
      case "l":
      case "L":
        // Toggle street lights
        console.log("🔄 Toggling street lights...");
        const newState = toggleStreetLights();

        // Update override indicator
        const overrideIndicator = document.getElementById(
          "light-override-indicator"
        );
        if (overrideIndicator) {
          overrideIndicator.style.display = "block";
          overrideIndicator.textContent = `🔒 Lights Override: ${
            newState ? "FORCED ON" : "FORCED OFF"
          }`;
        }

        // Also show debug information
        const allLights = getAllLightObjects();
        console.log(`Current light objects: ${allLights?.length || 0}`);
        allLights.forEach((light, i) => {
          console.log(
            `Light ${i}: position=${light.position.toArray()}, visible=${
              light.rectAreaLight?.visible
            }, intensity=${light.rectAreaLight?.intensity}`
          );
        });
        break;
      case "r":
      case "R":
        // Reset light override and restore time-based control
        console.log("🔓 Resetting street light override...");
        resetStreetLightOverride();

        // Hide override indicator
        const resetOverrideIndicator = document.getElementById(
          "light-override-indicator"
        );
        if (resetOverrideIndicator) {
          resetOverrideIndicator.style.display = "none";
        }

        // Immediately update lights based on current time
        setTimeout(() => {
          updateStreetLightsByTime(celestialSystem.gameHour);
        }, 100);
        break;
    }
  });

  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Add overlay menu (add this after other UI elements but before event listeners)
  const menuOverlay = document.createElement("div");
  menuOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 2000;
    `;

  const menuContainer = document.createElement("div");
  menuContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 200px;
    `;

  const menuButtons = [
    { text: "Settings", action: () => console.log("Settings clicked") },
    { text: "Help", action: () => console.log("Help clicked") },
    {
      text: "Close Game",
      action: () => {
        // Redirect to dashboard (assuming it's at the root level)
        window.location.href = "/";
      },
    },
    { text: "Back", action: () => toggleMenu(false) },
  ];

  menuButtons.forEach(({ text, action }) => {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.cssText = `
        padding: 15px 30px;
        font-size: 18px;
        border: none;
        border-radius: 8px;
        background: linear-gradient(135deg, rgba(26, 71, 42, 0.9), rgba(40, 114, 51, 0.95));
        color: #98ff98; // Light mint green text
        cursor: pointer;
        transition: all 0.3s ease;
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        border: 1px solid rgba(152, 255, 152, 0.3); // Subtle mint green border
      `;
    button.onmouseover = () => {
      button.style.transform = "scale(1.05)";
      button.style.background =
        "linear-gradient(135deg, rgba(40, 114, 51, 0.95), rgba(56, 161, 71, 0.95))";
    };
    button.onmouseout = () => {
      button.style.transform = "scale(1)";
      button.style.background =
        "linear-gradient(135deg, rgba(26, 71, 42, 0.9), rgba(40, 114, 51, 0.95))";
    };
    button.onclick = action;
    menuContainer.appendChild(button);
  });

  menuOverlay.appendChild(menuContainer);
  document.body.appendChild(menuOverlay);

  // Add menu toggle function
  function toggleMenu(show) {
    menuOverlay.style.display = show ? "flex" : "none";
    if (show) {
      document.exitPointerLock();
    } else {
      renderer.domElement.requestPointerLock();
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (objectPlacer?.active) {
        objectPlacer.cancelPlacement(); // Cancel placement first
        return;
      }

      const isMenuVisible = menuOverlay.style.display === "flex";
      toggleMenu(!isMenuVisible); // Toggle the menu
    }
  });

  // Add event listener for mascot interaction
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "f") {
      // Check if looking at mascot and interaction prompt is visible
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);

      if (
        isLookingAtMascot(cameraHolder.position, cameraDirection) &&
        !isShowingMascotDialog
      ) {
        // Show mascot dialog
        mascotDialog.textContent = getMascotDialog();
        mascotDialog.style.display = "block";
        isShowingMascotDialog = true;

        // Hide after 5 seconds
        if (mascotDialogTimeout) {
          clearTimeout(mascotDialogTimeout);
        }
        mascotDialogTimeout = setTimeout(() => {
          mascotDialog.style.display = "none";
          isShowingMascotDialog = false;
        }, 3000);
      }
    }
  });
}
