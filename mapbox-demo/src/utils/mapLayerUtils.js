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

/**
 * Adds a visual boundary layer to the map showing the observation area
 * @param {mapboxgl.Map} map - The Mapbox map instance
 * @param {Array} bounds - Array of [[minLng, minLat], [maxLng, maxLat]]
 */
export const addBoundaryLayer = (map, bounds) => {
  if (!bounds || bounds.length !== 2) return;

  // Remove existing boundary source and layer if they exist
  if (map.getSource('observation-boundary')) {
    if (map.getLayer('observation-boundary-fill')) map.removeLayer('observation-boundary-fill');
    if (map.getLayer('observation-boundary-line')) map.removeLayer('observation-boundary-line');
    map.removeSource('observation-boundary');
  }

  // Create a rectangle from bounds
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

  // Add source
  map.addSource('observation-boundary', {
    type: 'geojson',
    data: boundaryGeoJSON
  });

  // Add fill layer (semi-transparent)
  map.addLayer({
    id: 'observation-boundary-fill',
    type: 'fill',
    source: 'observation-boundary',
    paint: {
      'fill-color': '#3b82f6',
      'fill-opacity': 0.05
    }
  }, map.getLayer('3d-buildings') ? '3d-buildings' : undefined);

  // Add line layer (dashed border)
  map.addLayer({
    id: 'observation-boundary-line',
    type: 'line',
    source: 'observation-boundary',
    paint: {
      'line-color': '#3b82f6',
      'line-width': 2,
      'line-opacity': 0.6,
      'line-dasharray': [2, 2]
    }
  }, map.getLayer('3d-buildings') ? '3d-buildings' : undefined);
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
