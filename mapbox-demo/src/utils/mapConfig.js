/**
 * Mapbox configuration for multiple map styles including 3D buildings
 */

export const MAP_STYLES = {
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
  SATELLITE_STREETS: {
    name: 'Satellite',
    description: 'Satellite imagery with street labels',
    supports3D: false,
    icon: '🛰️',
  },
  STREETS: {
    name: 'Streets 3D',
    description: 'Street map with 3D buildings',
    supports3D: true,
    icon: '🏙️',
  },
  OUTDOORS: {
    name: 'Outdoors',
    description: 'Topographic outdoor map',
    supports3D: false,
    icon: '🏔️',
  },
  DARK: {
    name: 'Dark 3D',
    description: 'Dark theme with 3D buildings',
    supports3D: true,
    icon: '🌙',
  },
  LIGHT: {
    name: 'Light',
    description: 'Clean light theme',
    supports3D: false,
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
 * This layer adds building extrusions to compatible map styles
 */
export const BUILDING_3D_LAYER = {
  id: '3d-buildings',
  source: 'composite',
  'source-layer': 'building',
  filter: ['==', 'extrude', 'true'],
  type: 'fill-extrusion',
  minzoom: 14,
  paint: {
    'fill-extrusion-color': [
      'interpolate',
      ['linear'],
      ['get', 'height'],
      0, '#aaaaaa',
      50, '#999999',
      100, '#888888',
      200, '#777777',
    ],
    'fill-extrusion-height': [
      'interpolate',
      ['linear'],
      ['zoom'],
      14, 0,
      14.5, ['get', 'height'],
    ],
    'fill-extrusion-base': [
      'interpolate',
      ['linear'],
      ['zoom'],
      14, 0,
      14.5, ['get', 'min_height'],
    ],
    'fill-extrusion-opacity': 0.8,
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
