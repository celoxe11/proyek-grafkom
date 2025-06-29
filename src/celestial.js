import * as THREE from "three";

export class CelestialSystem {
  constructor(scene) {
    this.scene = scene;

    // Day-Night Cycle Colors
    this.DAY_COLOR = new THREE.Color("#87CEEB");
    this.NIGHT_COLOR = new THREE.Color("#000033");
    this.SUNSET_COLOR = new THREE.Color("#FF7F50");
    this.SUNRISE_COLOR = new THREE.Color("#FFA07A");

    // Fog Setup
    this.dayFog = new THREE.FogExp2(this.DAY_COLOR, 0.0005);
    this.nightFog = new THREE.FogExp2(this.NIGHT_COLOR, 0.001);
    this.scene.fog = this.dayFog;

    // Celestial Object Parameters (menggunakan nilai yang lebih kecil/lebih dekat dari file 1)
    this.celestialDistance = 800;
    this.celestialHeight = 400;

    // Create all celestial bodies
    this.createSun();
    this.createMoon();
    this.createStars();

    // Star Twinkling
    this.originalStarSizes = this.starsSizes.slice();
    this.starsTwinkleTime = 0;

    // --- Sistem Jam 24 Jam (Fitur Utama dari File 1) ---
    this.gameHour = 6; // Start at 6 AM
    this.gameMinute = 0;
    this.minuteStep = 10; // Waktu akan maju per 10 menit game
    this.timeMultiplier = 5; // 1 detik dunia nyata = 5 menit game
    this.minuteAccumulator = 0; // Akumulator untuk presisi
    this.lastUpdate = Date.now();
    this.lastStreetLightHour = -1; // -1 untuk memastikan update pertama kali
  }

  // Menggunakan createSun dari file 1 (lebih kecil dan lebih efisien)
  createSun() {
    const sunGeometry = new THREE.CircleGeometry(80, 32);
    const sunTexture = new THREE.TextureLoader().load("/wajah_matahari.jpg");
    const sunMaterial = new THREE.MeshBasicMaterial({
      map: sunTexture,
      fog: false,
      color: 0xffff55,
      side: THREE.DoubleSide,
    });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);

    // Glow effect (dari file 1)
    const sunGlowLayers = [
      { innerRadius: 80, outerRadius: 95, opacity: 0.6 },
      { innerRadius: 95, outerRadius: 115, opacity: 0.4 },
      { innerRadius: 115, outerRadius: 140, opacity: 0.3 },
      { innerRadius: 140, outerRadius: 170, opacity: 0.2 },
      { innerRadius: 170, outerRadius: 200, opacity: 0.1 },
    ];
    const sunGlowGroup = new THREE.Group();
    sunGlowGroup.position.z = -0.1;
    sunGlowLayers.forEach((layer) => {
      const glowGeometry = new THREE.RingGeometry(
        layer.innerRadius,
        layer.outerRadius,
        32
      );
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffdd44,
        transparent: true,
        opacity: layer.opacity,
        side: THREE.DoubleSide,
        fog: false,
        blending: THREE.AdditiveBlending,
      });
      sunGlowGroup.add(new THREE.Mesh(glowGeometry, glowMaterial));
    });
    this.sun.add(sunGlowGroup);

    this.scene.add(this.sun);
  }

  // Menggabungkan createMoon dari kedua file (dengan tekstur dan glow yang lebih baik)
  createMoon() {
    const moonGeometry = new THREE.CircleGeometry(35, 32);
    const moonTexture = new THREE.TextureLoader().load("/wajah_bulan.jpg"); // Menggunakan tekstur
    const moonMaterial = new THREE.MeshBasicMaterial({
      map: moonTexture,
      color: 0xf0f0ff,
      fog: false,
      side: THREE.DoubleSide,
    });
    this.moon = new THREE.Mesh(moonGeometry, moonMaterial);

    // Glow effect (dari file 1, lebih terang)
    const moonGlowGeometry = new THREE.RingGeometry(35, 45, 32);
    const moonGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      fog: false,
      blending: THREE.AdditiveBlending,
    });
    const moonGlow = new THREE.Mesh(moonGlowGeometry, moonGlowMaterial);
    moonGlow.position.z = -0.1;
    this.moon.add(moonGlow);

    this.moon.visible = false;
    this.scene.add(this.moon);
  }

  // Menggunakan createStars dari file 1 (radius lebih dekat)
  createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      vertexColors: true,
      size: 1.5,
      transparent: true,
      opacity: 0,
      fog: false,
      sizeAttenuation: false,
    });

    const starsCount = 2000;
    this.starsPositions = new Float32Array(starsCount * 3);
    this.starsSizes = new Float32Array(starsCount);
    const starsColors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
      const i3 = i * 3;
      const radius = 2000; // Radius lebih dekat
      const theta = Math.random() * Math.PI;
      const phi = Math.random() * Math.PI * 2;

      this.starsPositions[i3] = radius * Math.sin(theta) * Math.cos(phi);
      this.starsPositions[i3 + 1] = radius * Math.abs(Math.cos(theta));
      this.starsPositions[i3 + 2] = radius * Math.sin(theta) * Math.sin(phi);

      this.starsSizes[i] = 0.5 + Math.random() * 1.5;

      // Warna-warni
      const c = new THREE.Color();
      c.setHSL(0.55 + Math.random() * 0.1, 0.8, 0.8 + Math.random() * 0.2);
      starsColors.set([c.r, c.g, c.b], i3);
    }

    starsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.starsPositions, 3)
    );
    starsGeometry.setAttribute(
      "size",
      new THREE.BufferAttribute(this.starsSizes, 1)
    );
    starsGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(starsColors, 3)
    );

    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);
  }

  updateStarTwinkle() {
    this.starsTwinkleTime += 0.005;
    const sizes = this.stars.geometry.attributes.size.array;
    for (let i = 0; i < sizes.length; i++) {
      sizes[i] =
        this.originalStarSizes[i] *
        (Math.sin(this.starsTwinkleTime + i * 0.25) * 0.2 + 0.8);
    }
    this.stars.geometry.attributes.size.needsUpdate = true;
  }

  formatTimeString(hour, minute) {
    const h = hour % 12 === 0 ? 12 : hour % 12;
    const roundedMinute =
      Math.floor(minute / this.minuteStep) * this.minuteStep;
    const m = roundedMinute.toString().padStart(2, "0");
    const period = hour < 12 ? "AM" : "PM";
    return { timeString: `${h}:${m}`, period, hour, minute: roundedMinute };
  }

  // Fungsi update tunggal dan utama (dari file 1)
  update(camera, directionalLight) {
    // --- Update Waktu Game ---
    const deltaMs = Date.now() - this.lastUpdate;
    this.lastUpdate = Date.now();
    this.minuteAccumulator += (deltaMs / 1000) * this.timeMultiplier;

    if (this.minuteAccumulator >= this.minuteStep) {
      const stepsToAdvance = Math.floor(
        this.minuteAccumulator / this.minuteStep
      );
      this.gameMinute += stepsToAdvance * this.minuteStep;
      this.minuteAccumulator %= this.minuteStep;

      if (this.gameMinute >= 60) {
        this.gameHour = (this.gameHour + Math.floor(this.gameMinute / 60)) % 24;
        this.gameMinute %= 60;
      }
    }

    // --- Kontrol Lampu Jalan ---
    if (this.gameHour !== this.lastStreetLightHour) {
      import("./objects/streetLight.js")
        .then(({ updateStreetLightsByTime }) => {
          updateStreetLightsByTime(this.gameHour);
        })
        .catch((error) =>
          console.warn("Could not update street lights:", error)
        );
      this.lastStreetLightHour = this.gameHour;
    }

    // --- Perhitungan Siklus Siang-Malam ---
    const preciseMinutes =
      this.gameHour * 60 + this.gameMinute + this.minuteAccumulator;
    const dayProgress = preciseMinutes / (24 * 60);
    const cycleAngle = dayProgress * Math.PI * 2 - Math.PI / 2;

    const height = Math.sin(cycleAngle) * this.celestialHeight;
    const horizontalPos = Math.cos(cycleAngle) * this.celestialDistance;

    // --- Logika Siang vs Malam ---
    const isDaytime = this.gameHour >= 6 && this.gameHour < 18;

    if (height > 0) {
      // Matahari di atas cakrawala
      this.sun.position.set(horizontalPos, height, 0);
      this.sun.visible = true;
      this.moon.visible = false;

      const sunHeightFactor = height / this.celestialHeight; // 0 to 1
      directionalLight.intensity = 0.8 + sunHeightFactor * 1.2; // Cahaya lebih terang di siang bolong
      directionalLight.color.set(0xffffff);
      directionalLight.castShadow = true;
      directionalLight.shadow.bias = -0.001;

      // Transisi Warna Langit (Sunrise/Day)
      if (sunHeightFactor < 0.2) {
        // Sunrise
        this.scene.background
          .copy(this.SUNRISE_COLOR)
          .lerp(this.DAY_COLOR, sunHeightFactor / 0.2);
      } else if (sunHeightFactor < 0.9) {
        // Day
        this.scene.background.copy(this.DAY_COLOR);
      } else {
        // Sunset
        this.scene.background
          .copy(this.DAY_COLOR)
          .lerp(this.SUNSET_COLOR, (sunHeightFactor - 0.9) / 0.1);
      }
      this.scene.fog = this.dayFog;
      this.dayFog.color.copy(this.scene.background);

      this.stars.material.opacity = Math.max(
        0,
        this.stars.material.opacity - 0.02
      );
      directionalLight.position.copy(this.sun.position);
    } else {
      // Bulan di atas cakrawala
      this.moon.position.set(-horizontalPos, -height, 0);
      this.moon.visible = true;
      this.sun.visible = false;

      directionalLight.intensity = 0.2; // Cahaya bulan lebih redup
      directionalLight.color.set(0x8899ff); // Warna kebiruan
      directionalLight.castShadow = true; // Bayangan bulan tetap ada untuk realisme
      directionalLight.shadow.bias = -0.005;

      this.scene.background.copy(this.NIGHT_COLOR);
      this.scene.fog = this.nightFog;

      this.stars.material.opacity = Math.min(
        1.0,
        this.stars.material.opacity + 0.02
      );
      this.updateStarTwinkle();
      directionalLight.position.copy(this.moon.position);
    }

    // Arahkan directional light ke pusat scene
    directionalLight.target.position.set(0, 0, 0);

    // Buat matahari/bulan selalu menghadap kamera
    if (this.sun.visible) this.sun.lookAt(camera.position);
    if (this.moon.visible) this.moon.lookAt(camera.position);

    // Kembalikan data waktu untuk UI
    const timeData = this.formatTimeString(this.gameHour, this.gameMinute);
    timeData.isDaytime = isDaytime;
    return timeData;
  }
}
