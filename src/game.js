import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { CelestialSystem } from "./celestial.js";
import { Terrain } from "./terrain.js";
import { PlayerControls } from "./controls.js";
import { ObjectPlacer } from "./objectPlacer.js";
import { InteractionManager } from "./interactionManager.js";
import { TutorialManager } from "./tutorialManager.js";

// MERGE: Consolidated imports from both files
import {
  loadTicketBooth,
  updateMascotPosition,
  setMascotFollowing,
  checkTicketBoothCollision,
  isLookingAtMascot,
  getMascotDialog,
} from "./objects/ticketBooth.js";
import {
  loadHedgeFences,
  checkFenceCollisionMultiDirection,
} from "./objects/hedgeFences.js";

import { loadTrees } from "./objects/trees.js";

import {
  initializeNPCSystem,
  getNPCStats,
  getSittingPositionStatus,
} from "./objects/npc.js";
import {
  loadPicnicTableGroup,
  checkPicnicTableCollision,
} from "./objects/picnicTables.js";
import {
  loadParkCornerStreetLights,
  updateStreetLightsByTime,
  toggleStreetLights,
  resetStreetLightOverride,
} from "./objects/streetLight.js";
import {
  loadFerrisWheel,
  checkFerrisWheelCollision,
} from "./objects/ferrisWheel.js";

// Fungsi showWarning dari file pertama, sudah sangat baik.
function showWarning(message) {
  let warningContainer = document.getElementById("warning-container");
  if (!warningContainer) {
    warningContainer = document.createElement("div");
    warningContainer.id = "warning-container";
    warningContainer.className = "game-ui-element"; // Tambahkan class agar mudah dibersihkan
    warningContainer.style.cssText = `position: fixed; top: 20%; left: 50%; transform: translateX(-50%); z-index: 2000; display: flex; flex-direction: column; align-items: center; pointer-events: none;`;
    document.body.appendChild(warningContainer);
  }

  const warning = document.createElement("div");
  warning.textContent = message;
  warning.style.cssText = `background-color: rgba(255, 0, 0, 0.85); color: white; padding: 10px 20px; margin-bottom: 10px; border-radius: 6px; font-weight: bold; text-shadow: 1px 1px 3px black; border: 1px solid white; animation: fadeOut 1.5s ease-out 1.5s forwards;`;
  warningContainer.appendChild(warning);
  setTimeout(() => warning.remove(), 3000);
}

// Konstanta Sidebar dari file pertama (Struktur UI terbaik)
const SIDEBAR_HTML_CONTENT = `
  <div class="sidebar-section" id="game-status-section">
    <div class="sidebar-section-header">
      <h2>⏰ Game Status</h2>
    </div>
    <div class="sidebar-section-content">
      <div class="status-row">
        <span class="status-label"><span class="status-icon" id="time-icon">☀️</span> Time</span>
        <span class="status-value time-indicator" id="time-indicator-value">Day</span>
      </div>
       <div class="status-row" id="light-override-status-row" style="display: none;">
        <span class="status-label"><span class="status-icon" id="light-override-icon">💡</span> Light Status</span>
        <span class="status-value" id="light-override-indicator" style="color: #ffaa00;">OVERRIDE</span>
      </div>
      <div class="status-row">
        <span class="status-label"><span class="status-icon">📍</span> Position</span>
        <span class="status-value" id="position-indicator-value">X: 0, Y: 0, Z: 0</span>
      </div>
      <div class="status-row" id="npc-counter-container">
        <span class="status-label"><span class="status-icon">👥</span> NPCs</span>
        <span class="status-value" id="npc-counter">0/7</span>
      </div>
    </div>
  </div>
  <div class="sidebar-section" id="placeable-items-section">
    <div class="sidebar-section-header">
      <h2><span class="header-icon">📦</span> Placeable Items</h2>
    </div>
    <div class="sidebar-section-content">
      <ul class="item-list" id="placeable-item-list" tabindex="0">
        <li data-type="merry_go_round" class="placeable-item">🎠 Merry Go Round</li>
        <li data-type="swings" class="placeable-item">⛓️ Swing</li>
      </ul>
    </div>
  </div>
`;

// CSS Sidebar dari file pertama
const SIDEBAR_CSS_STYLES = `#game-sidebar { box-sizing: border-box; padding: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 0; background: linear-gradient(135deg, rgba(26, 71, 42, 0.9), rgba(40, 114, 51, 0.95)); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 5px 0 15px rgba(0, 0, 0, 0.2); color: white; font-family: 'Poppins', sans-serif; z-index: 1000; border-right: 1px solid rgba(255, 255, 255, 0.1); transition: all 0.3s ease; opacity: 0; visibility: hidden; } .sidebar-section { background-color: rgba(15, 30, 25, 0.85); border-radius: 10px; margin: 15px; border: 1px solid rgba(0, 255, 136, 0.25); box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35); overflow: hidden; } .sidebar-section-header { padding: 12px 18px; background-color: rgba(0, 255, 136, 0.12); border-bottom: 1px solid rgba(0, 255, 136, 0.25); } .sidebar-section-header h2 { margin: 0; font-size: 1.1em; color: #00ff88; font-weight: 600; text-shadow: 0 0 5px rgba(0, 255, 136, 0.45); } .sidebar-section-content { padding: 18px; display: flex; flex-direction: column; gap: 12px; } .status-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(0, 255, 136, 0.1); } .status-row:last-child { border-bottom: none; } .status-label { font-size: 0.95em; color: rgba(220, 255, 240, 0.9); display: flex; align-items: center; } .status-icon { margin-right: 10px; font-size: 1.2em; } .status-value { font-size: 0.95em; color: #00ff88; font-weight: 500; text-align: right; } #npc-counter { font-size: 0.8em; } .item-list { list-style: none; padding: 10px; margin: 0; border: 1px solid rgba(0, 255, 136, 0.15); border-radius: 6px; background-color: rgba(0,0,0,0.1); } .item-list li { padding: 10px 12px; background-color: rgba(0, 255, 136, 0.08); border-radius: 4px; color: rgba(220, 255, 240, 0.9); cursor: pointer; transition: background-color 0.2s ease; } .item-list li:hover { background-color: rgba(0, 255, 136, 0.2); }`;

export function initGame() {
  // ─── Tutorial & Root Setup (Struktur dari File 1) ──────────────────────
  const tutorial = new TutorialManager();
  tutorial.addStep(
    "Tekan <Tab> untuk membuka sidebar kontrol",
    (e) => e.key === "Tab"
  );
  tutorial.addStep(
    "Klik item di sidebar untuk mode penempatan",
    (e) => e.type === "click" && e.target.closest(".placeable-item")
  );
  tutorial.addStep(
    "Tekan <Enter> untuk meletakkan benda",
    (e) => e.key === "Enter"
  );
  tutorial.addStep(
    "Tekan <E> untuk berinteraksi dengan objek",
    (e) => e.key.toLowerCase() === "e"
  );

  const appElement = document.querySelector("#app");
  if (appElement) appElement.innerHTML = "";
  document.querySelectorAll(".game-ui-element").forEach((el) => el.remove());

  // ─── Scene & Renderer Setup (Digabungkan & Dioptimalkan) ───────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#87CEEB");
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    20000
  );
  const cameraHolder = new THREE.Object3D();
  cameraHolder.position.set(4, 7, 170);
  cameraHolder.add(camera);
  scene.add(cameraHolder);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.physicallyCorrectLights = false;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.0;
  appElement.appendChild(renderer.domElement);

  // ─── Game State & Core Entities (Struktur dari File 1) ─────────────────
  const clock = new THREE.Clock();
  const placedObjects = [];
  const celestialSystem = new CelestialSystem(scene);
  const terrain = new Terrain(scene);
  terrain.name = "ground";
  terrain.updateTextureSettings(renderer);
  let ferrisWheelMixer = null;

  const playerControls = new PlayerControls(
    camera,
    cameraHolder,
    renderer.domElement
  );
  const objectPlacer = new ObjectPlacer(
    scene,
    camera,
    cameraHolder,
    placedObjects
  );
  const interactionManager = new InteractionManager(
    camera,
    scene,
    placedObjects
  );

  // ─── Lighting (Digabungkan & Dioptimalkan) ─────────────────────────────
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
  scene.add(hemisphereLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(20, 100, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 4096;
  directionalLight.shadow.mapSize.height = 4096;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 1000;
  directionalLight.shadow.camera.left = -200;
  directionalLight.shadow.camera.right = 200;
  directionalLight.shadow.camera.top = 200;
  directionalLight.shadow.camera.bottom = -200;
  scene.add(directionalLight);

  const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
  shadowHelper.visible = false;
  scene.add(shadowHelper);

  // ─── UI Setup (Struktur dari File 1, konten digabungkan) ───────────────
  const stats = new Stats();
  stats.showPanel(0);
  stats.dom.style.cssText = `position: fixed !important; top: 20px !important; right: 240px !important; z-index: 1001;`;
  stats.dom.classList.add("game-ui-element");
  document.body.appendChild(stats.dom);

  const sidebarWidth = Math.min(300, window.innerWidth / 3);
  const sidebar = document.createElement("div");
  sidebar.id = "game-sidebar";
  sidebar.style.cssText = `position: fixed; top: 0; height: 100vh; left: -${sidebarWidth}px; width: ${sidebarWidth}px;`;
  sidebar.innerHTML = SIDEBAR_HTML_CONTENT;
  const sidebarStyles = document.createElement("style");
  sidebarStyles.textContent = SIDEBAR_CSS_STYLES;
  document.head.appendChild(sidebarStyles);
  document.body.appendChild(sidebar);
  sidebar.classList.add("game-ui-element");

  const mapPanel = document.createElement("div");
  mapPanel.id = "game-map";
  mapPanel.style.cssText = `position: fixed; top: 20px; right: 20px; width: 200px; height: 200px; background: rgba(0, 0, 0, 0.7); border-radius: 8px; padding: 8px; z-index: 1000; border: 1px solid rgba(255, 255, 255, 0.3); backdrop-filter: blur(5px);`;
  mapPanel.classList.add("game-ui-element");
  const mapCanvas = document.createElement("canvas");
  mapCanvas.width = 184;
  mapCanvas.height = 184;
  mapCanvas.style.background = "#1a1a1a";
  mapCanvas.style.borderRadius = "4px";
  mapPanel.appendChild(mapCanvas);
  document.body.appendChild(mapPanel);
  const mapCtx = mapCanvas.getContext("2d");

  const interactionPrompt = document.createElement("div");
  interactionPrompt.id = "interaction-prompt";
  interactionPrompt.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(255, 255, 255, 0.8); color: #333; padding: 8px 15px; border-radius: 20px; display: none; z-index: 1000; font-size: 16px; font-weight: bold; box-shadow: 0 0 10px rgba(0,0,0,0.3);`;
  interactionPrompt.classList.add("game-ui-element");
  document.body.appendChild(interactionPrompt);

  const mascotDialog = document.createElement("div");
  mascotDialog.id = "mascot-dialog";
  mascotDialog.style.cssText = `position: fixed; bottom: 50px; left: 50%; transform: translateX(-50%); background-color: rgba(255, 255, 255, 0.9); color: #333; padding: 15px 25px; border-radius: 10px; display: none; z-index: 1000; font-size: 18px; max-width: 80%; box-shadow: 0 0 15px rgba(0,0,0,0.4); border: 2px solid #00aaff;`;
  mascotDialog.classList.add("game-ui-element");
  document.body.appendChild(mascotDialog);

  let isShowingMascotDialog = false;
  let mascotDialogTimeout = null;

  const menuOverlay = document.createElement("div");
  menuOverlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: none; justify-content: center; align-items: center; z-index: 2000;`;
  menuOverlay.classList.add("game-ui-element");
  const menuContainer = document.createElement("div");
  menuContainer.style.cssText = `display: flex; flex-direction: column; gap: 20px; min-width: 200px;`;
  const menuButtons = [
    {
      text: "Settings",
      action: () => {
        settingsOverlay.style.display = "flex";
      },
    },
    { text: "Help", action: () => console.log("Help clicked") },
    { text: "Close Game", action: () => (window.location.href = "/") },
    { text: "Back", action: () => toggleMenu(false) },
  ];
  menuButtons.forEach(({ text, action }) => {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.cssText = `padding: 15px 30px; font-size: 18px; border: none; border-radius: 8px; background: linear-gradient(135deg, rgba(26, 71, 42, 0.9), rgba(40, 114, 51, 0.95)); color: #98ff98; cursor: pointer; transition: all 0.3s ease; backdrop-filter: blur(5px); border: 1px solid rgba(152, 255, 152, 0.3);`;
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
  const settingsOverlay = document.createElement("div");
  settingsOverlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); display: none; justify-content: center; align-items: center; z-index: 3000; color: white; font-size: 20px;`;
  settingsOverlay.classList.add("game-ui-element");
  settingsOverlay.innerHTML = `<div style="background: rgba(0,255,136,0.1); border: 1px solid #00ff88; padding: 30px; border-radius: 10px;"> <h2>Settings</h2> <p>Coming soon...</p> <button id="close-settings-btn" style="margin-top: 20px; padding: 10px 20px;">Close</button> </div>`;
  document.body.appendChild(settingsOverlay);
  document.getElementById("close-settings-btn").onclick = () => {
    settingsOverlay.style.display = "none";
  };
  function toggleMenu(show) {
    menuOverlay.style.display = show ? "flex" : "none";
    if (show) {
      document.exitPointerLock();
    } else {
      if (!objectPlacer.active) {
        renderer.domElement.requestPointerLock();
      }
    }
  }

  // ─── Loading Objek Statis (Digabungkan) ─────────────────────────
  async function loadStaticScenery() {
    loadTicketBooth(scene, {
      position: new THREE.Vector3(35, 0, 137.9),
      scale: 5,
      rotation: new THREE.Euler(0, Math.PI, 0),
    }).then(() => {
      console.log("Ticket booth loaded!");
      setMascotFollowing(true, cameraHolder);
    });

    loadHedgeFences(scene, {
      centerPoint: new THREE.Vector3(0, 0, 0),
      distance: 150,
      fenceHeight: 10,
      spacing: 15,
      modelPath: "./simple_brick_fence.glb",
    });
    loadTrees(scene, {
      centerPoint: new THREE.Vector3(0, 0, 0),
      parkDistance: 200,
      treeDistance: 200,
      treeSpacing: 150,
      treeScale: 0.7,
      modelPath: "./quick_treeit_tree.glb",
    });
    loadPicnicTableGroup(scene, {
      basePosition: new THREE.Vector3(-36.3, 0, 128.6),
      count: 3,
      spacing: 30,
      direction: "left",
    });

    initializeNPCSystem(scene, celestialSystem);

    loadParkCornerStreetLights(scene, {
      parkSize: 150,
      scale: 3,
      lightIntensity: 25,
      lightDistance: 100,
    }).then(() => {
      setTimeout(() => updateStreetLightsByTime(6), 1000); // Start at 6 AM
    });

    loadFerrisWheel(scene, {
      position: new THREE.Vector3(4, -120, -100),
      scale: 5,
      rotation: new THREE.Euler(0, Math.PI / 2, 0),
    }).then(({ mixer }) => {
      console.log("Ferris wheel loaded!");
      ferrisWheelMixer = mixer;
    });
  }
  loadStaticScenery();

  // ─── Game Loop (Fungsi Animate Digabungkan & Diperkaya) ────────────────
  const playerCollider = new THREE.Box3();
  function animate() {
    requestAnimationFrame(animate);
    stats.begin();
    const deltaTime = clock.getDelta();
    const previousPosition = cameraHolder.position.clone();

    // Update sistem inti
    playerControls.update(deltaTime);
    const timeData = celestialSystem.update(camera, directionalLight);
    if (objectPlacer.active) {
      objectPlacer.updatePreviewTransform();
    }

    if (ferrisWheelMixer) {
      ferrisWheelMixer.update(deltaTime);
    }

    updateMascotPosition(cameraHolder.position);

    for (const obj of placedObjects) {
      if (obj.update) obj.update(deltaTime);
    }

    // Deteksi tabrakan dengan objek yang ditempatkan
    playerCollider.setFromCenterAndSize(
      cameraHolder.position.clone().add(new THREE.Vector3(0, -0.5, 0)),
      new THREE.Vector3(1, 1.8, 1)
    );
    let isCollidingWithPlacedObject = false;
    for (const obj of placedObjects) {
      if (obj.checkCollision && obj.checkCollision(playerCollider)) {
        isCollidingWithPlacedObject = true;
        break;
      }
    }
    if (isCollidingWithPlacedObject) {
      playerControls.rollbackPosition();
    }

    if (
      checkFenceCollisionMultiDirection(cameraHolder.position, 2.0).collision ||
      checkTicketBoothCollision(cameraHolder.position, 1.5) ||
      checkPicnicTableCollision(cameraHolder.position, 1.0).collision ||
      checkFerrisWheelCollision(cameraHolder.position, 1.5).collision
    ) {
      cameraHolder.position.copy(previousPosition);
    }

    hemisphereLight.intensity = timeData.isDaytime ? 1.0 : 0.2;
    updateStreetLightsByTime(timeData.gameHour);

    // PERBAIKAN KUNCI 1: Panggil `update` dan simpan hasilnya untuk digunakan di UI prompt
    const nearbyInteractable = interactionManager.update(cameraHolder.position);
    updateMap();

    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    // Logika UI prompt sekarang menggunakan hasil dari `update` di atas
    if (
      isLookingAtMascot(cameraHolder.position, cameraDirection) &&
      !isShowingMascotDialog
    ) {
      interactionPrompt.textContent = "Tekan F untuk Bicara";
      interactionPrompt.style.display = "block";
    } else {
      interactionPrompt.style.display = "none";
    }

    document.getElementById(
      "position-indicator-value"
    ).textContent = `X: ${cameraHolder.position.x.toFixed(
      1
    )}, Y: ${cameraHolder.position.y.toFixed(
      1
    )}, Z: ${cameraHolder.position.z.toFixed(1)}`;
    const timeIndicatorValue = document.getElementById("time-indicator-value");
    if (timeIndicatorValue)
      timeIndicatorValue.textContent = `${timeData.timeString} ${timeData.period}`;
    const timeIcon = document.getElementById("time-icon");
    if (timeIcon) timeIcon.textContent = timeData.isDaytime ? "☀️" : "🌙";

    const npcCounter = document.getElementById("npc-counter");
    if (npcCounter) {
      const npcStats = getNPCStats();
      const sittingStatus = getSittingPositionStatus();
      let npcText = `${npcStats.currentCount}/${npcStats.maxCount} | Seats: ${sittingStatus.occupied}/${sittingStatus.total}`;
      if (npcStats.currentCount < npcStats.maxCount) {
        const minutesUntilNext = Math.ceil(npcStats.nextSpawnIn / (60 * 1000));
        npcText += `<br>Next in ${minutesUntilNext}m`;
      }
      npcCounter.innerHTML = npcText;
    }

    renderer.render(scene, camera);
    stats.end();
  }

  // ─── Event Listeners (Digabungkan & Disempurnakan) ─────────────────────
  function updateMap() {
    mapCtx.fillStyle = "#1a1a1a";
    mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    const mapScale = 3;
    const centerX = mapCanvas.width / 2;
    const centerZ = mapCanvas.height / 2;
    const pos = cameraHolder.position;
    mapCtx.fillStyle = "#ffffff";
    mapCtx.beginPath();
    mapCtx.arc(
      centerX + pos.x / mapScale,
      centerZ + pos.z / mapScale,
      3,
      0,
      Math.PI * 2
    );
    mapCtx.fill();
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    mapCtx.strokeStyle = "#ffffff";
    mapCtx.beginPath();
    mapCtx.moveTo(centerX + pos.x / mapScale, centerZ + pos.z / mapScale);
    mapCtx.lineTo(
      centerX + pos.x / mapScale + dir.x * 10,
      centerZ + pos.z / mapScale + dir.z * 10
    );
    mapCtx.stroke();
  }
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  document.addEventListener("keydown", async (event) => {
    tutorial.completeStep(event);

    if (event.key === "Escape") {
      if (objectPlacer.active) {
        objectPlacer.cancelPlacement();
        return;
      }
      toggleMenu(menuOverlay.style.display !== "flex");
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const isVisible = sidebar.style.left === "0px";
      if (isVisible) {
        sidebar.style.left = `-${sidebar.offsetWidth}px`;
        sidebar.style.opacity = "0";
        sidebar.style.visibility = "hidden";
      } else {
        sidebar.style.left = "0px";
        sidebar.style.opacity = "1";
        sidebar.style.visibility = "visible";
      }
    }

    if (event.key === "Enter" && objectPlacer.active) {
      const placedObject = await objectPlacer.confirmPlacement();
      if (placedObject) {
        placedObjects.push(placedObject);
        if (placedObject.model && placedObject.onInteraction) {
          interactionManager.addInteractableObject(
            placedObject.model,
            placedObject.name,
            () => {
              placedObject.onInteraction();
            }
          );
        }
      }
    }

    // Tombol 'F' khusus untuk berbicara dengan maskot
    if (event.key.toLowerCase() === "f") {
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);

      if (
        isLookingAtMascot(cameraHolder.position, cameraDirection) &&
        !isShowingMascotDialog
      ) {
        mascotDialog.textContent = getMascotDialog();
        mascotDialog.style.display = "block";
        isShowingMascotDialog = true;

        if (mascotDialogTimeout) clearTimeout(mascotDialogTimeout);
        mascotDialogTimeout = setTimeout(() => {
          mascotDialog.style.display = "none";
          isShowingMascotDialog = false;
        }, 3000);
      }
    }

    // Tombol 'E' untuk berinteraksi dengan objek lain
    if (event.key.toLowerCase() === "e") {
      // PERBAIKAN KUNCI 2: Gunakan `update` untuk mencari objek, bukan `getNearbyObject`
      const nearby = interactionManager.update(cameraHolder.position);
      if (nearby) {
        // Jika ada, jalankan fungsi interaksinya
        interactionManager.handleInteraction(nearby);
      }
    }
    

    // Event listener untuk debug dan kontrol lampu (sudah benar)
    switch (event.key.toLowerCase()) {
      case "h":
        shadowHelper.visible = !shadowHelper.visible;
        break;
      case "p":
        break
      case "o":

        break;
      case "l":
        const newState = toggleStreetLights();
        const lightOverrideRow = document.getElementById(
          "light-override-status-row"
        );
        const lightOverrideIndicator = document.getElementById(
          "light-override-indicator"
        );
        if (lightOverrideRow && lightOverrideIndicator) {
          lightOverrideRow.style.display = "flex";
          lightOverrideIndicator.textContent = newState
            ? "FORCED ON"
            : "FORCED OFF";
        }
        break;
      case "r":
        resetStreetLightOverride();
        const resetRow = document.getElementById("light-override-status-row");
        if (resetRow) {
          resetRow.style.display = "none";
        }
        break;
    }
  });

  document
    .getElementById("placeable-item-list")
    .addEventListener("click", async (event) => {
      const item = event.target.closest(".placeable-item");
      if (!item) return;

      tutorial.completeStep(event);
      const objectTypeKey = item.getAttribute("data-type");
      if (objectTypeKey) {
        await objectPlacer.startPlacement(objectTypeKey);
      }
    });

  // ─── Start Game ───────────────────────────────────────────────────────────
  tutorial.start();
  animate();
}