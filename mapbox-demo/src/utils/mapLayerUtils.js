/**
 * Utility functions for managing map layers
 */

import { BUILDING_3D_LAYER, MAP_STYLES, MAP_STYLE_INFO } from './mapConfig';

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
  wallHeight: 160,             // Height in meters (100% taller than original 80m)
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

  // Update 3D wall opacity (breathing effect)
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
 * Adds a 3D boundary visualization with vertical walls
 *
 * VISUAL DESIGN:
 * This creates 3D walls along the boundary edges without filling the interior:
 *
 * 1. 3D Walls - Vertical extruded walls (80m high) only on the edges
 * 2. Top edge glow - Bright glowing line at the top (animated for visibility)
 * 3. Base foundation - Solid ground line for reference
 *
 * The walls are created as 4 separate thin polygons (one for each edge)
 * that get extruded vertically, creating a "box frame" effect without
 * obscuring the interior of the bounded area.
 *
 * @param {mapboxgl.Map} map - The Mapbox map instance
 * @param {Array} bounds - Array of [[minLng, minLat], [maxLng, maxLat]]
 */
export const addBoundaryLayer = (map, bounds) => {
  if (!bounds || bounds.length !== 2) return;

  // Remove existing boundary layers if they exist
  const layersToRemove = [
    'observation-boundary-walls',
    'observation-boundary-top-edge',
    'observation-boundary-base-line'
  ];

  layersToRemove.forEach(layerId => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  });

  // Remove sources
  if (map.getSource('observation-boundary-walls')) {
    map.removeSource('observation-boundary-walls');
  }
  if (map.getSource('observation-boundary')) {
    map.removeSource('observation-boundary');
  }

  // Create 4 separate line segments for each edge of the boundary
  // This allows us to extrude each edge as a 3D wall without filling the interior
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;

  // Create a thin buffer polygon for each edge
  const edgeWidth = 0.00001; // Very thin in degrees

  const southWall = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [minLng, minLat - edgeWidth],
        [maxLng, minLat - edgeWidth],
        [maxLng, minLat + edgeWidth],
        [minLng, minLat + edgeWidth],
        [minLng, minLat - edgeWidth]
      ]]
    }
  };

  const northWall = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [minLng, maxLat - edgeWidth],
        [maxLng, maxLat - edgeWidth],
        [maxLng, maxLat + edgeWidth],
        [minLng, maxLat + edgeWidth],
        [minLng, maxLat - edgeWidth]
      ]]
    }
  };

  const westWall = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [minLng - edgeWidth, minLat],
        [minLng + edgeWidth, minLat],
        [minLng + edgeWidth, maxLat],
        [minLng - edgeWidth, maxLat],
        [minLng - edgeWidth, minLat]
      ]]
    }
  };

  const eastWall = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [maxLng - edgeWidth, minLat],
        [maxLng + edgeWidth, minLat],
        [maxLng + edgeWidth, maxLat],
        [maxLng - edgeWidth, maxLat],
        [maxLng - edgeWidth, minLat]
      ]]
    }
  };

  const wallsGeoJSON = {
    type: 'FeatureCollection',
    features: [southWall, northWall, westWall, eastWall]
  };

  // Also create the outline for 2D reference lines
  const outlineGeoJSON = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat]
      ]]
    }
  };

  // Add sources
  map.addSource('observation-boundary-walls', {
    type: 'geojson',
    data: wallsGeoJSON
  });

  map.addSource('observation-boundary', {
    type: 'geojson',
    data: outlineGeoJSON
  });

  // Determine where to insert layers (below 3D buildings and markers)
  const beforeLayer = map.getLayer('3d-buildings') ? '3d-buildings' : undefined;

  // ===== LAYER 1: 3D Walls (extruded edges only - no interior fill) =====
  // Creates vertical 3D walls along each edge of the boundary
  map.addLayer({
    id: 'observation-boundary-walls',
    type: 'fill-extrusion',
    source: 'observation-boundary-walls',
    paint: {
      'fill-extrusion-color': BOUNDARY_CONFIG.wallColor,
      'fill-extrusion-height': BOUNDARY_CONFIG.wallHeight,
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': BOUNDARY_CONFIG.wallOpacity,
      'fill-extrusion-vertical-gradient': true
    }
  }, beforeLayer);

  // ===== LAYER 2: Top Edge Glow (animated outline at top of walls) =====
  // Bright glowing line with pulsing animation for visibility
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

  // ===== LAYER 3: Base Foundation Line (ground reference) =====
  // Solid line at ground level for spatial reference
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
  // Launch the animation loop for the top edge glow
  // The animation creates a pulsing effect on the outline
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
    'observation-boundary-walls',
    'observation-boundary-top-edge',
    'observation-boundary-base-line'
  ];

  layersToRemove.forEach(layerId => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  });

  // Remove sources
  if (map.getSource('observation-boundary-walls')) {
    map.removeSource('observation-boundary-walls');
  }
  if (map.getSource('observation-boundary')) {
    map.removeSource('observation-boundary');
  }
};

/**
 * Add boundary layer from polygon geometry (actual polygon shape, not bounds)
 * Creates 3D walls that follow the exact polygon boundary
 * @param {mapboxgl.Map} map - Mapbox map instance
 * @param {Object} polygon - Polygon geometry from API (GeoJSON Polygon format)
 */
export const addBoundaryLayerFromPolygon = (map, polygon) => {
  // Validate polygon
  if (!polygon || !polygon.coordinates || polygon.coordinates.length === 0) {
    console.warn('Invalid polygon provided to addBoundaryLayerFromPolygon');
    return;
  }

  // Remove existing boundary layers if they exist
  const layersToRemove = [
    'observation-boundary-walls',
    'observation-boundary-top-edge',
    'observation-boundary-base-line'
  ];

  layersToRemove.forEach(layerId => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  });

  // Remove sources
  if (map.getSource('observation-boundary-walls')) {
    map.removeSource('observation-boundary-walls');
  }
  if (map.getSource('observation-boundary')) {
    map.removeSource('observation-boundary');
  }

  // Extract coordinates from first ring (outer boundary)
  let coords = polygon.coordinates[0];

  if (!coords || coords.length === 0) {
    console.warn('Polygon has no coordinates in first ring');
    return;
  }

  // Ensure the polygon is closed (first point === last point)
  const firstPoint = coords[0];
  const lastPoint = coords[coords.length - 1];
  const isClosed = firstPoint[0] === lastPoint[0] && firstPoint[1] === lastPoint[1];

  if (!isClosed) {
    console.log('🔄 Closing polygon by adding first point at the end');
    coords = [...coords, firstPoint];
  }

  console.log('📐 Creating 3D boundary from polygon with', coords.length, 'points');

  // Create the polygon outline for reference lines
  const outlineGeoJSON = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  };

  // Create thin wall segments along each edge of the polygon
  const edgeWidth = 0.0001; // Wall thickness in degrees (increased 10x for visibility)
  const wallFeatures = [];

  // For each edge of the polygon, create a thin rectangular wall
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];

    // Calculate perpendicular offset for wall thickness
    const dx = lng2 - lng1;
    const dy = lat2 - lat1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const perpX = (-dy / length) * edgeWidth;
    const perpY = (dx / length) * edgeWidth;

    // Create a thin rectangular polygon for this edge
    const wallSegment = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [lng1 - perpX, lat1 - perpY],
          [lng2 - perpX, lat2 - perpY],
          [lng2 + perpX, lat2 + perpY],
          [lng1 + perpX, lat1 + perpY],
          [lng1 - perpX, lat1 - perpY]
        ]]
      }
    };

    wallFeatures.push(wallSegment);
  }

  const wallsGeoJSON = {
    type: 'FeatureCollection',
    features: wallFeatures
  };

  // Add sources
  map.addSource('observation-boundary-walls', {
    type: 'geojson',
    data: wallsGeoJSON
  });

  map.addSource('observation-boundary', {
    type: 'geojson',
    data: outlineGeoJSON
  });

  // Determine where to insert layers (below 3D buildings and markers)
  const beforeLayer = map.getLayer('3d-buildings') ? '3d-buildings' : undefined;

  // Add 3D Walls (extruded edges following polygon shape)
  map.addLayer({
    id: 'observation-boundary-walls',
    type: 'fill-extrusion',
    source: 'observation-boundary-walls',
    paint: {
      'fill-extrusion-color': BOUNDARY_CONFIG.wallColor,
      'fill-extrusion-height': BOUNDARY_CONFIG.wallHeight,
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': BOUNDARY_CONFIG.wallOpacity,
      'fill-extrusion-vertical-gradient': true
    }
  }, beforeLayer);

  // Add Top Edge Glow (animated outline at top of walls)
  map.addLayer({
    id: 'observation-boundary-top-edge',
    type: 'line',
    source: 'observation-boundary',
    paint: {
      'line-color': BOUNDARY_CONFIG.topEdgeColor,
      'line-width': BOUNDARY_CONFIG.topEdgeWidth,
      'line-opacity': BOUNDARY_CONFIG.topEdgeOpacity,
      'line-blur': 2
    }
  }, beforeLayer);

  // Add Base Foundation Line (ground reference)
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

  // Start animations
  setTimeout(() => {
    startBoundaryAnimation(map);
  }, 100);
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
