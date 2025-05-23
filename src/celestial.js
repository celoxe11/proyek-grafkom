import * as THREE from "three";

export class CelestialSystem {
  constructor(scene) {
    this.scene = scene;
    
    // Day-Night Cycle Setup
    this.DAY_COLOR = new THREE.Color('#87CEEB'); // Sky blue for day
    this.NIGHT_COLOR = new THREE.Color('#000033'); // Dark blue for night
    this.SUNSET_COLOR = new THREE.Color('#FF7F50'); // Coral color for sunset
    this.SUNRISE_COLOR = new THREE.Color('#FFA07A'); // Light salmon for sunrise
    this.CYCLE_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds for each phase
    this.DAY_NIGHT_DURATION = this.CYCLE_DURATION * 2; // Total cycle duration
    this.cycleStartTime = Date.now();
    
    // Fog Setup
    this.dayFog = new THREE.FogExp2('#87CEEB', 0.0005);
    this.nightFog = new THREE.FogExp2('#000033', 0.001);
    this.scene.fog = this.dayFog;
    
    // Set the celestial distance and maximum height
    this.celestialDistance = 1500;
    this.celestialHeight = 800;
    
    // Create all celestial bodies
    this.createSun();
    this.createMoon();
    this.createStars();
    
    // Initialize twinkling variables
    this.originalStarSizes = this.starsSizes.slice();
    this.starsTwinkleTime = 0;
  }
  
  createSun() {
    // Create Sun with texture as a flat circle
    const sunGeometry = new THREE.CircleGeometry(200, 32);
    const sunTextureLoader = new THREE.TextureLoader();
    const sunTexture = sunTextureLoader.load('/wajah_matahari.jpg');
    
    const sunMaterial = new THREE.MeshBasicMaterial({ 
      map: sunTexture,
      fog: false,
      color: 0xffff55,
      side: THREE.DoubleSide
    });
    
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    
    // Add a glow effect around the sun - using multiple layers
    const sunGlowLayers = [
      { innerRadius: 200, outerRadius: 220, opacity: 0.6 },
      { innerRadius: 220, outerRadius: 245, opacity: 0.4 },
      { innerRadius: 245, outerRadius: 275, opacity: 0.3 },
      { innerRadius: 275, outerRadius: 310, opacity: 0.2 },
      { innerRadius: 310, outerRadius: 350, opacity: 0.1 }
    ];
    
    const sunGlowGroup = new THREE.Group();
    sunGlowGroup.position.z = -0.1; // Place slightly behind the sun face
    
    // Create multiple glow rings with decreasing opacity
    sunGlowLayers.forEach(layer => {
      const glowGeometry = new THREE.RingGeometry(layer.innerRadius, layer.outerRadius, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffdd44,
        transparent: true,
        opacity: layer.opacity,
        side: THREE.DoubleSide,
        fog: false,
        blending: THREE.AdditiveBlending
      });
      const glowRing = new THREE.Mesh(glowGeometry, glowMaterial);
      sunGlowGroup.add(glowRing);
    });
    
    this.sun.add(sunGlowGroup);
    
    // Make the sun a stronger light source
    this.sunLight = new THREE.PointLight(0xffffcc, 2, 10000);
    this.sun.add(this.sunLight);
    
    // Initial position
    this.sun.position.set(this.celestialDistance, 50, 0);
    this.sun.rotation.set(0, 0, 0);
    this.scene.add(this.sun);
  }
  
  createMoon() {
    // Create Moon as a flat circle
    const moonGeometry = new THREE.CircleGeometry(70, 32);
    const moonMaterial = new THREE.MeshBasicMaterial({
      color: 0xDDDDFF,
      fog: false,
      side: THREE.DoubleSide
    });
    this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
    
    // Add a subtle glow to the moon
    const moonGlowGeometry = new THREE.RingGeometry(70, 85, 32);
    const moonGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaaaff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      fog: false
    });
    const moonGlow = new THREE.Mesh(moonGlowGeometry, moonGlowMaterial);
    moonGlow.position.z = -0.1;
    this.moon.add(moonGlow);
    
    // Moon light source
    this.moonLight = new THREE.PointLight(0xaaaaff, 1, 10000);
    this.moon.add(this.moonLight);
    
    // Set initial position
    this.moon.position.set(-this.celestialDistance, 50, 0);
    this.moon.visible = false;
    this.scene.add(this.moon);
  }
  
  createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0,
      fog: false,
      sizeAttenuation: false
    });
    
    // Create star positions
    const starsCount = 2000;
    this.starsPositions = new Float32Array(starsCount * 3);
    this.starsSizes = new Float32Array(starsCount);
    const starsColors = new Float32Array(starsCount * 3);
    
    for (let i = 0; i < starsCount; i++) {
      const i3 = i * 3;
      
      // Random position on a sphere
      const radius = 5000;
      const theta = Math.random() * Math.PI;
      const phi = Math.random() * Math.PI * 2;
      
      // Only place stars in the upper hemisphere
      const x = radius * Math.sin(theta) * Math.cos(phi);
      const y = radius * Math.abs(Math.cos(theta));
      const z = radius * Math.sin(theta) * Math.sin(phi);
      
      this.starsPositions[i3] = x;
      this.starsPositions[i3 + 1] = y;
      this.starsPositions[i3 + 2] = z;
      
      // Random sizes for stars
      this.starsSizes[i] = 0.5 + Math.random() * 1.5;
      
      // Slightly different colors
      const colorChoice = Math.random();
      if (colorChoice > 0.8) {
        // Blue-white stars
        starsColors[i3] = 0.8 + Math.random() * 0.2;
        starsColors[i3 + 1] = 0.8 + Math.random() * 0.2;
        starsColors[i3 + 2] = 1.0;
      } else if (colorChoice > 0.6) {
        // Yellow-white stars
        starsColors[i3] = 1.0;
        starsColors[i3 + 1] = 1.0;
        starsColors[i3 + 2] = 0.8 + Math.random() * 0.2;
      } else {
        // White stars
        starsColors[i3] = 1.0;
        starsColors[i3 + 1] = 1.0;
        starsColors[i3 + 2] = 1.0;
      }
    }
    
    // Set attributes for the stars geometry
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(this.starsPositions, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(this.starsSizes, 1));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(starsColors, 3));
    
    // Create the stars points system
    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);
  }
  
  updateStarTwinkle() {
    this.starsTwinkleTime += 0.005;
    
    const sizes = this.stars.geometry.attributes.size.array;
    for (let i = 0; i < sizes.length; i++) {
      // Create a unique twinkling pattern for each star
      const twinkle = Math.sin(this.starsTwinkleTime + i * 0.25) * 0.2 + 0.8;
      sizes[i] = this.originalStarSizes[i] * twinkle;
    }
    
    this.stars.geometry.attributes.size.needsUpdate = true;
  }
  
  update(camera, directionalLight) {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.cycleStartTime) % this.DAY_NIGHT_DURATION;
    
    // Calculate cycle progress (0 to 1)
    const dayProgress = (elapsedTime % this.CYCLE_DURATION) / this.CYCLE_DURATION;
    
    // Determine if it's day or night
    const isDay = elapsedTime < this.CYCLE_DURATION;
    
    // Update status indicator
    const timeIndicator = document.getElementById('time-indicator');
    if (timeIndicator) {
      timeIndicator.textContent = isDay ? 'Day' : 'Night';
      timeIndicator.className = isDay ? 'day' : 'night';
    }
    
    // Make celestial bodies face the camera
    // For sun
    if (this.sun.visible) {
      const sunToCam = new THREE.Vector3().subVectors(camera.position, this.sun.position).normalize();
      const lookAtPos = new THREE.Vector3().addVectors(this.sun.position, sunToCam);
      this.sun.lookAt(lookAtPos);
    }
    
    // For moon
    if (this.moon.visible) {
      const moonToCam = new THREE.Vector3().subVectors(camera.position, this.moon.position).normalize();
      const moonLookAtPos = new THREE.Vector3().addVectors(this.moon.position, moonToCam);
      this.moon.lookAt(moonLookAtPos);
    }
    
    // Update positions and visibility
    if (isDay) {
      this.updateDaytime(dayProgress, directionalLight);
    } else {
      this.updateNighttime(dayProgress, directionalLight);
    }
    
    return isDay;
  }
  
  updateDaytime(dayProgress, directionalLight) {
    // During day, move sun from east to west in a semi-circle
    const angle = dayProgress * Math.PI;
    const height = Math.sin(angle) * this.celestialHeight;
    const horizontalPos = Math.cos(angle) * this.celestialDistance;
    
    this.sun.position.set(horizontalPos, height, 0);
    this.sun.visible = true;
    this.moon.visible = false;
    
    // Reset directional light color to sunlight
    directionalLight.color.set(0xffffff);
    
    // Calculate dynamic lighting based on sun position
    const lightIntensity = Math.sin(dayProgress * Math.PI) * 0.8 + 0.2;
    
    // Dynamic fog and colors depending on time of day
    if (dayProgress < 0.1 || dayProgress > 0.9) {
      // Dawn or dusk - transition colors and fog
      const sunriseWeight = dayProgress < 0.1 ? 1 - dayProgress * 10 : (dayProgress - 0.9) * 10;
      const skyColorBase = dayProgress < 0.1 ? this.SUNRISE_COLOR : this.SUNSET_COLOR;
      
      // Blend between day color and sunrise/sunset color
      const skyColor = new THREE.Color().copy(this.DAY_COLOR).lerp(skyColorBase, sunriseWeight);
      this.scene.background.copy(skyColor);
      
      // Update fog for dawn/dusk
      this.scene.fog = this.dayFog;
      this.dayFog.color.copy(skyColor);
      // Increase fog density during sunrise/sunset
      this.dayFog.density = 0.0005 + (sunriseWeight * 0.0008);
    } else {
      // Regular daytime
      this.scene.background.copy(this.DAY_COLOR);
      this.scene.fog = this.dayFog;
      this.dayFog.color.copy(this.DAY_COLOR);
      this.dayFog.density = 0.0005;
    }
    
    directionalLight.intensity = lightIntensity;
    
    // Update directional light to follow sun position
    directionalLight.position.copy(this.sun.position).normalize();
    
    // Hide stars during the day by fading them out
    const starMaterial = this.stars.material;
    starMaterial.opacity = Math.max(0, starMaterial.opacity - 0.02);
  }
  
  updateNighttime(dayProgress, directionalLight) {
    // During night, move moon from east to west in a semi-circle
    const angle = dayProgress * Math.PI;
    const height = Math.sin(angle) * this.celestialHeight;
    const horizontalPos = Math.cos(angle) * this.celestialDistance;
    
    this.moon.position.set(horizontalPos, height, 0);
    this.moon.visible = true;
    this.sun.visible = false;
    
    // Evening to morning
    const lightIntensity = 0.2;
    this.scene.background.copy(this.NIGHT_COLOR);
    directionalLight.intensity = lightIntensity;
    
    // Use night fog
    this.scene.fog = this.nightFog;
    this.nightFog.color.copy(this.NIGHT_COLOR);
    
    // Dynamic fog density based on moon height
    const moonHeight = Math.sin(angle);
    this.nightFog.density = 0.001 + (0.001 * (1 - moonHeight));
    
    // Update directional light for moonlight effect
    directionalLight.position.copy(this.moon.position).normalize();
    directionalLight.color.set(0xaaaaff);
    
    // Show stars at night by fading them in
    const starMaterial = this.stars.material;
    starMaterial.opacity = Math.min(1.0, starMaterial.opacity + 0.02);
    
    // Update star twinkling
    this.updateStarTwinkle();
  }
}
