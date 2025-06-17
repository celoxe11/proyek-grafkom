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
    this.celestialDistance = 800; // Reduced from 1500 to bring closer
    this.celestialHeight = 400; // Reduced proportionally
    
    // Create all celestial bodies
    this.createSun();
    this.createMoon();
    this.createStars();
    
    // Initialize twinkling variables
    this.originalStarSizes = this.starsSizes.slice();
    this.starsTwinkleTime = 0;
    
    // Add clock properties
    this.gameHour = 6; // Start at 6 AM to see the street lights turn off during day
    this.gameMinute = 0;
    this.timeMultiplier = 5; // 1 real second = 5 game minutes
    this.minuteStep = 10; // Minutes will increment by 10
    this.minuteAccumulator = 0; // Track partial minutes before updating display
    this.lastUpdate = Date.now();
    
    // Performance optimization: cache frequently used vectors
    this.tempVector = new THREE.Vector3();
    this.tempVector2 = new THREE.Vector3();
    
    // Reduce update frequencies for performance
    this.lightUpdateCounter = 0;
    this.starUpdateCounter = 0;
    
    // Street light update tracking
    this.lastStreetLightHour = this.gameHour;
    
    // Initialize street lights based on starting hour
    setTimeout(() => {
      this.initializeStreetLights();
    }, 1000); // Give time for street lights to load
  }
  
  createSun() {
    // Create Sun with texture as a flat circle - smaller size
    const sunGeometry = new THREE.CircleGeometry(80, 32); // Reduced from 200 to 80
    const sunTextureLoader = new THREE.TextureLoader();
    const sunTexture = sunTextureLoader.load('/wajah_matahari.jpg');
    
    const sunMaterial = new THREE.MeshBasicMaterial({ 
      map: sunTexture,
      fog: false,
      color: 0xffff55,
      side: THREE.DoubleSide
    });
    
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    
    // Add a glow effect around the sun - adjusted for smaller size
    const sunGlowLayers = [
      { innerRadius: 80, outerRadius: 95, opacity: 0.6 }, // Adjusted proportionally
      { innerRadius: 95, outerRadius: 115, opacity: 0.4 },
      { innerRadius: 115, outerRadius: 140, opacity: 0.3 },
      { innerRadius: 140, outerRadius: 170, opacity: 0.2 },
      { innerRadius: 170, outerRadius: 200, opacity: 0.1 }
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
    // Create Moon as a flat circle - slightly smaller
    const moonGeometry = new THREE.CircleGeometry(35, 32); // Reduced from 70 to 35
    const sunTextureLoader = new THREE.TextureLoader();
    const moonTexture = sunTextureLoader.load('/wajah_bulan.jpg');
    const moonMaterial = new THREE.MeshBasicMaterial({
      map: moonTexture,
      color: 0xF0F0FF, // Brighter, whiter color
      fog: false,
      side: THREE.DoubleSide
    });
    this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
    
    // Add a stronger white glow to the moon - adjusted for smaller size
    const moonGlowGeometry = new THREE.RingGeometry(35, 45, 32); // Adjusted from 70, 85
    const moonGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF, // Pure white glow
      transparent: true,
      opacity: 0.5, // Slightly higher opacity
      side: THREE.DoubleSide,
      fog: false,
      blending: THREE.AdditiveBlending // Add additive blending for brighter glow
    });
    const moonGlow = new THREE.Mesh(moonGlowGeometry, moonGlowMaterial);
    moonGlow.position.z = -0.1;
    this.moon.add(moonGlow);
    
    // Remove moon light source to make nights darker
    // this.moonLight = new THREE.PointLight(0xF8F8FF, 1.2, 10000);
    // this.moon.add(this.moonLight);
    
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
      
      // Random position on a sphere - closer radius
      const radius = 2000; // Reduced from 5000 to bring stars closer
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
  
  // Helper method to format time string
  formatTimeString(hour, minute) {
    const h = hour % 12 === 0 ? 12 : hour % 12;
    // Round minutes to nearest 10
    const roundedMinute = Math.floor(minute / this.minuteStep) * this.minuteStep;
    const m = roundedMinute.toString().padStart(2, '0');
    const period = hour < 12 ? 'AM' : 'PM';
    return {
      timeString: `${h}:${m}`,
      period: period,
      hour: hour,
      minute: roundedMinute // Use the rounded minute value
    };
  }
  
  // Add method to initialize street lights based on current time
  initializeStreetLights() {
    import('./streetLight.js').then(({ updateStreetLightsByTime }) => {
      console.log(`🚦 Initializing street lights for starting hour: ${this.gameHour}`);
      updateStreetLightsByTime(this.gameHour);
    }).catch(error => {
      console.warn('Could not initialize street lights:', error);
    });
  }
  
  update(camera, directionalLight) {
    const currentTime = Date.now();
    const deltaMs = currentTime - this.lastUpdate;
    this.lastUpdate = currentTime;
    
    // Update game time based on delta
    const gameMinutesElapsed = (deltaMs / 1000) * this.timeMultiplier;
    this.minuteAccumulator += gameMinutesElapsed;
    
    // Only update displayed minutes when we've accumulated enough for a step
    if (this.minuteAccumulator >= this.minuteStep) {
      // Calculate how many steps to advance
      const stepsToAdvance = Math.floor(this.minuteAccumulator / this.minuteStep);
      this.gameMinute += stepsToAdvance * this.minuteStep;
      this.minuteAccumulator %= this.minuteStep; // Keep remainder for next update
      
      // Handle minute overflow
      if (this.gameMinute >= 60) {
        this.gameHour += Math.floor(this.gameMinute / 60);
        this.gameMinute %= 60;
        
        // Handle hour overflow
        if (this.gameHour >= 24) {
          this.gameHour %= 24;
        }
      }
    }
    
    // Check if hour changed and update street lights
    if (this.gameHour !== this.lastStreetLightHour) {
      console.log(`🕐 Hour changed from ${this.lastStreetLightHour} to ${this.gameHour}`);
      // Import and call street light update function
      import('./streetLight.js').then(({ updateStreetLightsByTime }) => {
        console.log(`🔄 Calling updateStreetLightsByTime with hour: ${this.gameHour}`);
        updateStreetLightsByTime(this.gameHour);
        console.log(`✅ Updated street lights for hour ${this.gameHour}`);
      }).catch(error => {
        console.warn('Could not update street lights:', error);
      });
      this.lastStreetLightHour = this.gameHour;
    }
    
    // Calculate day cycle progress based on current game time
    // Use precise time (including accumulator) for smooth celestial movement
    const preciseMinutes = this.gameMinute + this.minuteAccumulator;
    const dayProgress = (this.gameHour * 60 + preciseMinutes) / (24 * 60);
    
    // Determine if it's day or night (day: 6am to 6pm)
    const isDaytime = this.gameHour >= 6 && this.gameHour < 18;
    
    // Get time data for UI - this will show time rounded to nearest 10 minutes
    const timeData = this.formatTimeString(this.gameHour, this.gameMinute);
    timeData.isDaytime = isDaytime;
    
    // Update status indicator
    const timeIndicator = document.getElementById('time-indicator');
    if (timeIndicator) {
      timeIndicator.textContent = `Time: ${timeData.timeString} ${timeData.period} (${isDaytime ? 'Day' : 'Night'})`;
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
    
    // Calculate sun/moon position based on time
    // Full day-night cycle
    const cycleAngle = (dayProgress * Math.PI * 2) - Math.PI/2; // -π/2 so it starts from the east
    
    // Height follows a sine curve over the day
    const height = Math.sin(cycleAngle) * this.celestialHeight;
    
    // Horizontal position follows a cosine curve
    const horizontalPos = Math.cos(cycleAngle) * this.celestialDistance;
    
    // Update sun and moon
    if (height > 0) {
      // Sun is above horizon
      this.sun.position.set(horizontalPos, height, 0);
      this.sun.visible = true;
      this.moon.visible = false;
      
      // Sun lighting (brighter at noon, dimmer at sunrise/sunset)
      const sunHeight = height / this.celestialHeight; // 0 to 1
      directionalLight.intensity = 0.5 + sunHeight * 0.8;
      directionalLight.color.set(0xffffff);
      
      // Sky color transitions
      if (sunHeight < 0.2) {
        // Sunrise gradient
        const t = sunHeight / 0.2;
        const skyColor = new THREE.Color().copy(this.SUNRISE_COLOR).lerp(this.DAY_COLOR, t);
        this.scene.background = skyColor;
        this.scene.fog = this.dayFog;
        this.dayFog.color.copy(skyColor);
      } else {
        // Day sky
        this.scene.background = this.DAY_COLOR;
        this.scene.fog = this.dayFog;
        this.dayFog.color.copy(this.DAY_COLOR);
      }
      
      // Hide stars during the day
      const starMaterial = this.stars.material;
      starMaterial.opacity = Math.max(0, starMaterial.opacity - 0.02);
      
    } else {
      // Moon is above horizon
      this.moon.position.set(-horizontalPos, -height, 0); // opposite position to sun
      this.moon.visible = true;
      this.sun.visible = false;
      
      // Stronger moon lighting for better visibility
      directionalLight.intensity = 0.3; // Increased from 0.02 to 0.3
      directionalLight.color.set(0x6699ff); // Brighter blue tint for moonlight
      
      // Night sky
      this.scene.background = this.NIGHT_COLOR;
      this.scene.fog = this.nightFog;
      this.nightFog.color.copy(this.NIGHT_COLOR);
      
      // Show stars at night
      const starMaterial = this.stars.material;
      starMaterial.opacity = Math.min(1.0, starMaterial.opacity + 0.02);
      
      // Update star twinkling
      this.updateStarTwinkle();
    }
    
    // Update directional light to follow sun/moon position
    if (this.sun.visible) {
      // Position directional light to come FROM the sun's direction
      const sunToCenter = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), this.sun.position).normalize();
      directionalLight.position.copy(this.sun.position);
      directionalLight.target.position.set(0, 0, 0);
      directionalLight.target.updateMatrixWorld();
    } else {
      // Position directional light to come FROM the moon's direction
      directionalLight.position.copy(this.moon.position);
      directionalLight.target.position.set(0, 0, 0);
      directionalLight.target.updateMatrixWorld();
    }
    
    // Manage shadows based on time of day
    if (height > 0) {
      // Daytime - enable shadows with stronger settings
      directionalLight.castShadow = true;
      
      // Adjust shadow intensity based on sun height
      const sunHeight = height / this.celestialHeight;
      directionalLight.intensity = 1.0 + sunHeight * 1.5; // Increased intensity
      
      // Better shadow settings for daytime
      directionalLight.shadow.bias = -0.0005;
      directionalLight.shadow.normalBias = 0.01;
    } else {
      // Nighttime - stronger moon shadows for better visibility
      directionalLight.castShadow = true; // Keep shadows for realistic moon shadows
      directionalLight.intensity = 0.4; // Much brighter moon lighting
      directionalLight.shadow.bias = -0.001;
      directionalLight.shadow.normalBias = 0.02;
    }
    
    return timeData;
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
    const lightIntensity = Math.sin(dayProgress * Math.PI) * 1.2 + 0.8; // Increased intensity
    
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
    
    // Update directional light to follow sun direction but at reasonable distance
    const sunDirection = new THREE.Vector3().subVectors(this.sun.position, new THREE.Vector3(0, 0, 0)).normalize();
    directionalLight.position.copy(sunDirection.multiplyScalar(200));
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.target.updateMatrixWorld();
    
    // Enable shadows during daytime with stronger settings
    directionalLight.castShadow = true;
    directionalLight.shadow.bias = -0.008; // Much more negative for darker shadows
    directionalLight.shadow.normalBias = 0.005;
    
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
    
    // Much dimmer lighting for night to emphasize street lights
    const lightIntensity = 0.05; // Reduced from 0.4 to make streets lights more prominent
    this.scene.background.copy(this.NIGHT_COLOR);
    directionalLight.intensity = lightIntensity;
    
    // Use night fog
    this.scene.fog = this.nightFog;
    this.nightFog.color.copy(this.NIGHT_COLOR);
    
    // Dynamic fog density based on moon height
    const moonHeight = Math.sin(angle);
    this.nightFog.density = 0.001 + (0.001 * (1 - moonHeight));
    
    // Update directional light for minimal moonlight effect
    directionalLight.position.copy(this.moon.position);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.target.updateMatrixWorld();
    directionalLight.color.set(0x444477); // Darker blue color
    
    // Show stars at night by fading them in
    const starMaterial = this.stars.material;
    starMaterial.opacity = Math.min(1.0, starMaterial.opacity + 0.02);
    
    // Update star twinkling
    this.updateStarTwinkle();
  }
}
