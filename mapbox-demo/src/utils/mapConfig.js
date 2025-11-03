/**
 * Mapbox configuration for multiple map styles including 3D buildings
 */

export const MAP_STYLES = {
  STANDARD: 'mapbox://styles/mapbox/standard',
  SATELLITE: 'mapbox://styles/mapbox/satellite-v9',
  SATELLITE_STREETS: 'mapbox://styles/mapbox/satellite-streets-v12',
  STREETS: 'mapbox://styles/mapbox/streets-v12',
  OUTDOORS: 'mapbox://styles/mapbox/outdoors-v12',
  DARK: 'mapbox://styles/mapbox/dark-v11',
  LIGHT: 'mapbox://styles/mapbox/light-v11',
};

/**
 * Map style metadata for UI display
 */
export const MAP_STYLE_INFO = {
  STANDARD: {
    name: 'Standard (Realistic)',
    description: 'Modern style with photorealistic 3D buildings',
    supports3D: true,
    hasBuiltIn3D: true, // Standard has built-in 3D buildings
    icon: '🏢',
  },
  SATELLITE_STREETS: {
    name: 'Satellite 3D',
    description: 'Satellite imagery with 3D buildings',
    supports3D: true,
    icon: '🛰️',
  },
  STREETS: {
    name: 'Streets 3D',
    description: 'Street map with 3D buildings',
    supports3D: true,
    icon: '🏙️',
  },
  OUTDOORS: {
    name: 'Outdoors 3D',
    description: 'Topographic map with 3D buildings',
    supports3D: true,
    icon: '🏔️',
  },
  DARK: {
    name: 'Dark 3D',
    description: 'Dark theme with 3D buildings',
    supports3D: true,
    icon: '🌙',
  },
  LIGHT: {
    name: 'Light 3D',
    description: 'Light theme with 3D buildings',
    supports3D: true,
    icon: '☀️',
  },
};

export const DEFAULT_MAP_CONFIG = {
  style: MAP_STYLES.STREETS, // Default to streets with 3D buildings
  zoom: 15,
  pitch: 45, // Tilt for 3D view (0 = flat, 60 = max tilt)
  bearing: 0,
  antialias: true,
  attributionControl: true,
  logoPosition: 'bottom-left',
};

/**
 * 3D Building Layer Configuration
 * Realistic building extrusions with proper lighting and materials
 */
export const BUILDING_3D_LAYER = {
  id: '3d-buildings',
  source: 'composite',
  'source-layer': 'building',
  filter: ['==', 'extrude', 'true'],
  type: 'fill-extrusion',
  minzoom: 14,
  paint: {
    // Realistic building colors with varied tones based on height
    'fill-extrusion-color': [
      'case',
      // Taller buildings (100m+) - darker, modern glass
      ['>=', ['get', 'height'], 100],
      '#6b7280',
      // Mid-height buildings (50-100m) - concrete/stone
      ['>=', ['get', 'height'], 50],
      '#9ca3af',
      // Low-rise buildings (20-50m) - residential/commercial
      ['>=', ['get', 'height'], 20],
      '#d1d5db',
      // Small buildings (<20m) - lighter tone
      '#e5e7eb'
    ],

    // Building height with smooth transition
    'fill-extrusion-height': [
      'interpolate',
      ['linear'],
      ['zoom'],
      14, 0,
      14.05, ['get', 'height']
    ],

    // Building base (for buildings on platforms)
    'fill-extrusion-base': [
      'interpolate',
      ['linear'],
      ['zoom'],
      14, 0,
      14.05, ['get', 'min_height']
    ],

    // Full opacity for solid appearance
    'fill-extrusion-opacity': 1,

    // Ambient occlusion for depth and shadows
    'fill-extrusion-ambient-occlusion-intensity': 0.5,

    // Realistic lighting from above
    'fill-extrusion-vertical-gradient': true,
  },
};

/**
 * Check if a map style supports 3D buildings
 * @param {string} styleUrl - Mapbox style URL
 * @returns {boolean}
 */
export const supports3DBuildings = (styleUrl) => {
  const styleKey = Object.keys(MAP_STYLES).find(
    key => MAP_STYLES[key] === styleUrl
  );
  return styleKey ? MAP_STYLE_INFO[styleKey]?.supports3D : false;
};

/**
 * Calculate optimal zoom level for bounds
 * @param {Array} bounds - [[minLng, minLat], [maxLng, maxLat]]
 * @param {number} width - Map width in pixels
 * @param {number} height - Map height in pixels
 * @returns {number} Optimal zoom level
 */
export const calculateOptimalZoom = (bounds, width = 800, height = 600) => {
  if (!bounds) return 15;

  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  const lngDiff = maxLng - minLng;
  const latDiff = maxLat - minLat;

  // Simple zoom calculation (can be refined)
  const maxDiff = Math.max(lngDiff, latDiff);

  if (maxDiff > 0.1) return 12;
  if (maxDiff > 0.05) return 13;
  if (maxDiff > 0.02) return 14;
  if (maxDiff > 0.01) return 15;
  return 16;
};
