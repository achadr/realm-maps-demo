/**
 * Utility functions for managing map layers
 */

import { supports3DBuildings, BUILDING_3D_LAYER, MAP_STYLES, MAP_STYLE_INFO } from './mapConfig';

/**
 * Removes layers and their source from the map
 * @param {mapboxgl.Map} map - The Mapbox map instance
 * @param {string} sourceId - The source ID to remove
 * @param {string[]} layerIds - Array of layer IDs to remove
 */
export const removeLayersAndSource = (map, sourceId, layerIds) => {
  if (!map.getSource(sourceId)) return;

  // Remove all layers
  layerIds.forEach(layerId => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  });

  // Remove source
  map.removeSource(sourceId);
};

// ========================================
// 3D BOUNDARY VISUALIZATION CONFIGURATION
// ========================================
// These constants control the "Holographic Force Field" effect
// Adjust these values to customize the visual appearance

const BOUNDARY_CONFIG = {
  // Main 3D wall configuration
  wallHeight: 80,              // Height in meters (sweet spot for 45-degree view)
  wallColor: '#06b6d4',        // Cyan color for modern tech feel
  wallOpacity: 0.25,           // Base opacity (25% solid)

  // Inner glow layer (creates depth and "energy" effect)
  innerGlowColor: '#0ea5e9',   // Bright blue for inner glow
  innerGlowOpacity: 0.08,      // Subtle fill

  // Top edge glow (the "force field" rim)
  topEdgeColor: '#22d3ee',     // Bright cyan for top glow
  topEdgeOpacity: 0.9,         // Very visible
  topEdgeWidth: 4,             // Thick glowing line

  // Base foundation line (ground reference)
  baseLineColor: '#0284c7',    // Dark cyan
  baseLineOpacity: 0.5,        // Medium visibility
  baseLineWidth: 2,

  // Corner pillars (dramatic emphasis at corners)
  cornerPillarHeight: 100,     // Taller than main walls
  cornerPillarColor: '#0891b2', // Cyan shade
  cornerPillarOpacity: 0.4,    // More solid than walls
  cornerPillarRadius: 8,       // Size of corner posts (meters)

  // ===== ANIMATION SETTINGS =====
  // These control the "living force field" animations
  enableAnimations: true,           // Master switch for all animations
  wallPulsePeriod: 3500,           // Wall pulse cycle duration (ms) - breathing effect
  edgeGlowPeriod: 2500,            // Edge glow cycle duration (ms) - energy crackling
  pillarPulsePeriod: 3000,         // Pillar pulse cycle duration (ms) - beacon effect
  innerGlowPulsePeriod: 4000,      // Inner glow pulse (slower, more subtle)

  // Animation ranges (min/max values for pulsing properties)
  wallOpacityRange: [0.10, 0.40],  // Wall opacity oscillates between these values (wider range for visibility)
  edgeWidthRange: [2, 6],          // Edge width pulses between these values (wider range)
  edgeOpacityRange: [0.6, 1.0],    // Edge opacity pulses for extra shimmer (wider range)
  pillarOpacityRange: [0.25, 0.55],  // Pillar opacity for beacon effect (wider range)
  innerGlowOpacityRange: [0.03, 0.15], // Subtle inner glow pulse (wider range)
};

// ========================================
// ANIMATION SYSTEM
// ========================================

// Global animation state - stores animation frame ID for cleanup
let boundaryAnimationFrameId = null;

/**
 * Easing function for smooth, natural animations
 * Uses sine wave for smooth oscillation (ease-in-out effect)
 * @param {number} t - Time progress (0 to 1)
 * @returns {number} Eased value (0 to 1)
 */
const easeInOutSine = (t) => {
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

/**
 * Calculates animated value based on time and period
 * Creates smooth oscillation between min and max values
 * @param {number} currentTime - Current timestamp (ms)
 * @param {number} period - Animation cycle duration (ms)
 * @param {Array} range - [min, max] values for the property
 * @returns {number} Animated value between min and max
 */
const getAnimatedValue = (currentTime, period, range) => {
  const [min, max] = range;
  // Calculate progress through current cycle (0 to 1)
  const progress = (currentTime % period) / period;
  // Apply easing for smooth motion
  const eased = easeInOutSine(progress);
  // Interpolate between min and max
  return min + (max - min) * eased;
};

/**
 * Animation loop that updates all boundary layer properties
 * Uses requestAnimationFrame for smooth 60fps updates
 * @param {mapboxgl.Map} map - The Mapbox map instance
 */
const animateBoundaryLayers = (map) => {
  // Check if animations are enabled and map is loaded
  if (!BOUNDARY_CONFIG.enableAnimations || !map.loaded()) {
    return;
  }

  const currentTime = performance.now();

  // Update wall opacity (breathing effect)
  if (map.getLayer('observation-boundary-walls')) {
    const wallOpacity = getAnimatedValue(
      currentTime,
      BOUNDARY_CONFIG.wallPulsePeriod,
      BOUNDARY_CONFIG.wallOpacityRange
    );
    map.setPaintProperty('observation-boundary-walls', 'fill-extrusion-opacity', wallOpacity);
  }

  // Update top edge glow (energy crackling effect)
  if (map.getLayer('observation-boundary-top-edge')) {
    const edgeWidth = getAnimatedValue(
      currentTime,
      BOUNDARY_CONFIG.edgeGlowPeriod,
      BOUNDARY_CONFIG.edgeWidthRange
    );
    const edgeOpacity = getAnimatedValue(
      currentTime,
      BOUNDARY_CONFIG.edgeGlowPeriod,
      BOUNDARY_CONFIG.edgeOpacityRange
    );
    map.setPaintProperty('observation-boundary-top-edge', 'line-width', edgeWidth);
    map.setPaintProperty('observation-boundary-top-edge', 'line-opacity', edgeOpacity);
  }

  // Update corner pillars (beacon effect)
  if (map.getLayer('observation-boundary-corners')) {
    const pillarOpacity = getAnimatedValue(
      currentTime,
      BOUNDARY_CONFIG.pillarPulsePeriod,
      BOUNDARY_CONFIG.pillarOpacityRange
    );
    map.setPaintProperty('observation-boundary-corners', 'fill-extrusion-opacity', pillarOpacity);
  }

  // Update inner glow (subtle ambient pulse)
  if (map.getLayer('observation-boundary-inner-glow')) {
    const innerGlowOpacity = getAnimatedValue(
      currentTime,
      BOUNDARY_CONFIG.innerGlowPulsePeriod,
      BOUNDARY_CONFIG.innerGlowOpacityRange
    );
    map.setPaintProperty('observation-boundary-inner-glow', 'fill-opacity', innerGlowOpacity);
  }

  // Continue animation loop
  boundaryAnimationFrameId = requestAnimationFrame(() => animateBoundaryLayers(map));
};

/**
 * Starts the boundary animation loop
 * @param {mapboxgl.Map} map - The Mapbox map instance
 */
export const startBoundaryAnimation = (map) => {
  // Stop any existing animation first
  stopBoundaryAnimation();

  // Start new animation loop if enabled
  if (BOUNDARY_CONFIG.enableAnimations) {
    console.log('🎬 Starting boundary animations...');
    animateBoundaryLayers(map);
  } else {
    console.log('⏸️  Boundary animations disabled in config');
  }
};

/**
 * Stops the boundary animation loop and cleans up resources
 * Important: Always call this when removing boundary layers!
 */
export const stopBoundaryAnimation = () => {
  if (boundaryAnimationFrameId !== null) {
    cancelAnimationFrame(boundaryAnimationFrameId);
    boundaryAnimationFrameId = null;
  }
};

/**
 * Creates corner pillar geometries for dramatic corner emphasis
 * @param {number} lng - Longitude of corner
 * @param {number} lat - Latitude of corner
 * @param {number} radius - Radius of pillar in meters (approximate)
 * @returns {Object} GeoJSON polygon for the pillar
 */
const createCornerPillar = (lng, lat, radius) => {
  // Convert radius from meters to approximate degrees
  // At equator: 1 degree ≈ 111km, so radius in degrees ≈ radius_meters / 111000
  const radiusDeg = radius / 111000;

  // Create a small square around the corner point
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [lng - radiusDeg, lat - radiusDeg],
        [lng + radiusDeg, lat - radiusDeg],
        [lng + radiusDeg, lat + radiusDeg],
        [lng - radiusDeg, lat + radiusDeg],
        [lng - radiusDeg, lat - radiusDeg]
      ]]
    }
  };
};

/**
 * Adds a stunning 3D "Holographic Force Field" boundary visualization
 *
 * VISUAL DESIGN:
 * This creates a multi-layered 3D effect that looks like a holographic
 * force field or energy barrier around the observation area:
 *
 * 1. Base inner glow - Subtle fill at ground level for spatial reference
 * 2. Main 3D walls - Semi-transparent extruded walls (80m high)
 * 3. Corner pillars - Taller accent posts at corners (100m high)
 * 4. Top edge glow - Bright glowing line at the top of walls
 * 5. Base foundation - Solid ground line for reference
 *
 * The gradient opacity (solid at base, transparent at top) combined with
 * the 45-degree pitch creates a beautiful "force field" effect that's
 * visible but not overwhelming.
 *
 * @param {mapboxgl.Map} map - The Mapbox map instance
 * @param {Array} bounds - Array of [[minLng, minLat], [maxLng, maxLat]]
 */
export const addBoundaryLayer = (map, bounds) => {
  if (!bounds || bounds.length !== 2) return;

  // Remove existing boundary layers if they exist
  const layersToRemove = [
    'observation-boundary-inner-glow',
    'observation-boundary-walls',
    'observation-boundary-corners',
    'observation-boundary-top-edge',
    'observation-boundary-base-line'
  ];

  layersToRemove.forEach(layerId => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  });

  // Remove sources
  if (map.getSource('observation-boundary')) {
    map.removeSource('observation-boundary');
  }
  if (map.getSource('observation-boundary-corners')) {
    map.removeSource('observation-boundary-corners');
  }

  // Create main boundary rectangle
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  const boundaryGeoJSON = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [minLng, minLat], // Southwest
        [maxLng, minLat], // Southeast
        [maxLng, maxLat], // Northeast
        [minLng, maxLat], // Northwest
        [minLng, minLat]  // Close the polygon
      ]]
    }
  };

  // Create corner pillars for dramatic emphasis
  const cornerPillars = {
    type: 'FeatureCollection',
    features: [
      createCornerPillar(minLng, minLat, BOUNDARY_CONFIG.cornerPillarRadius), // SW
      createCornerPillar(maxLng, minLat, BOUNDARY_CONFIG.cornerPillarRadius), // SE
      createCornerPillar(maxLng, maxLat, BOUNDARY_CONFIG.cornerPillarRadius), // NE
      createCornerPillar(minLng, maxLat, BOUNDARY_CONFIG.cornerPillarRadius), // NW
    ]
  };

  // Add sources
  map.addSource('observation-boundary', {
    type: 'geojson',
    data: boundaryGeoJSON
  });

  map.addSource('observation-boundary-corners', {
    type: 'geojson',
    data: cornerPillars
  });

  // Determine where to insert layers (below 3D buildings and markers)
  const beforeLayer = map.getLayer('3d-buildings') ? '3d-buildings' : undefined;

  // ===== LAYER 1: Inner Glow (Ground-level energy field) =====
  // Subtle fill that creates depth and shows the "protected zone"
  map.addLayer({
    id: 'observation-boundary-inner-glow',
    type: 'fill',
    source: 'observation-boundary',
    paint: {
      'fill-color': BOUNDARY_CONFIG.innerGlowColor,
      'fill-opacity': BOUNDARY_CONFIG.innerGlowOpacity
    }
  }, beforeLayer);

  // ===== LAYER 2: Main 3D Walls (The primary force field effect) =====
  // Semi-transparent extruded walls with gradient opacity
  // The gradient makes walls solid at base and transparent at top,
  // creating a beautiful "energy field" appearance
  map.addLayer({
    id: 'observation-boundary-walls',
    type: 'fill-extrusion',
    source: 'observation-boundary',
    paint: {
      'fill-extrusion-color': BOUNDARY_CONFIG.wallColor,
      'fill-extrusion-height': BOUNDARY_CONFIG.wallHeight,
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': BOUNDARY_CONFIG.wallOpacity,
      // Gradient opacity from base to top (requires Mapbox GL JS v2+)
      'fill-extrusion-vertical-gradient': true
    }
  }, beforeLayer);

  // ===== LAYER 3: Corner Pillars (Dramatic corner emphasis) =====
  // Taller posts at corners that draw the eye and add structure
  map.addLayer({
    id: 'observation-boundary-corners',
    type: 'fill-extrusion',
    source: 'observation-boundary-corners',
    paint: {
      'fill-extrusion-color': BOUNDARY_CONFIG.cornerPillarColor,
      'fill-extrusion-height': BOUNDARY_CONFIG.cornerPillarHeight,
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': BOUNDARY_CONFIG.cornerPillarOpacity,
      'fill-extrusion-vertical-gradient': true
    }
  }, beforeLayer);

  // ===== LAYER 4: Top Edge Glow (The "force field" rim) =====
  // Bright glowing line at the top of the walls
  // This creates the iconic "energy barrier" look
  map.addLayer({
    id: 'observation-boundary-top-edge',
    type: 'line',
    source: 'observation-boundary',
    paint: {
      'line-color': BOUNDARY_CONFIG.topEdgeColor,
      'line-width': BOUNDARY_CONFIG.topEdgeWidth,
      'line-opacity': BOUNDARY_CONFIG.topEdgeOpacity,
      'line-blur': 2 // Soft glow effect
    }
  }, beforeLayer);

  // ===== LAYER 5: Base Foundation Line (Ground reference) =====
  // Solid line at ground level for spatial reference
  // Helps users understand the boundary extent
  map.addLayer({
    id: 'observation-boundary-base-line',
    type: 'line',
    source: 'observation-boundary',
    paint: {
      'line-color': BOUNDARY_CONFIG.baseLineColor,
      'line-width': BOUNDARY_CONFIG.baseLineWidth,
      'line-opacity': BOUNDARY_CONFIG.baseLineOpacity
    }
  }, beforeLayer);

  // ===== START ANIMATIONS =====
  // Launch the animation loop to bring the force field to life!
  // The animations create a "living energy field" effect with:
  // - Pulsing walls (breathing effect)
  // - Glowing edge (energy crackling)
  // - Pulsing pillars (beacon effect)
  // - Subtle inner glow (ambient energy)
  // Small delay to ensure layers are fully rendered before animating
  setTimeout(() => {
    startBoundaryAnimation(map);
  }, 100);
};

/**
 * Removes boundary layers and stops all animations
 * Call this when hiding or cleaning up the boundary visualization
 * @param {mapboxgl.Map} map - The Mapbox map instance
 */
export const removeBoundaryLayer = (map) => {
  // Stop animations first to prevent updates to removed layers
  stopBoundaryAnimation();

  // Remove all boundary layers
  const layersToRemove = [
    'observation-boundary-inner-glow',
    'observation-boundary-walls',
    'observation-boundary-corners',
    'observation-boundary-top-edge',
    'observation-boundary-base-line'
  ];

  layersToRemove.forEach(layerId => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  });

  // Remove sources
  if (map.getSource('observation-boundary')) {
    map.removeSource('observation-boundary');
  }
  if (map.getSource('observation-boundary-corners')) {
    map.removeSource('observation-boundary-corners');
  }
};

/**
 * Adds 3D buildings layer to the map for supported styles
 * Skips styles that have built-in 3D buildings (e.g., Standard style)
 * @param {mapboxgl.Map} map - The Mapbox map instance
 * @param {string} currentStyle - The current map style URL
 */
export const add3DBuildingsLayer = (map, currentStyle) => {
  // Check if current style has built-in 3D buildings (e.g., Standard style)
  const styleKey = Object.keys(MAP_STYLES).find(
    key => MAP_STYLES[key] === currentStyle
  );
  if (styleKey && MAP_STYLE_INFO[styleKey]?.hasBuiltIn3D) {
    return;
  }

  // Check if layer already exists
  if (map.getLayer('3d-buildings')) {
    return;
  }

  // Check composite source - but with a more robust check
  const source = map.getSource('composite');
  if (!source) {
    // Schedule a retry - composite may not be ready yet
    setTimeout(() => {
      if (map.getSource('composite')) {
        add3DBuildingsLayer(map, currentStyle);
      }
    }, 100);
    return;
  }

  try {
    // Add the 3D buildings layer
    map.addLayer(BUILDING_3D_LAYER);
  } catch (err) {
    // Handle error silently
  }
};
