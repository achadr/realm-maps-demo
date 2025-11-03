import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { config } from '../../config';
import { DEFAULT_MAP_CONFIG, supports3DBuildings, BUILDING_3D_LAYER, MAP_STYLES } from '../../utils/mapConfig';
import '../../styles/map.css';

// Set Mapbox token globally
mapboxgl.accessToken = config.mapbox.token;

/**
 * MapSection - Embedded map component (section-based, not fullscreen)
 * @param {number} realmId - ID of the realm to display
 * @param {number} height - Height in pixels (default: 600)
 */
const MapSection = ({ realmId = 12436, height = 600, initialStyle = MAP_STYLES.STREETS }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentStyle, setCurrentStyle] = useState(initialStyle);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize map
  useEffect(() => {
    if (!mapboxgl.accessToken) {
      setError('Mapbox token not configured');
      setLoading(false);
      return;
    }

    if (!mapContainerRef.current) return;

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      ...DEFAULT_MAP_CONFIG,
      style: currentStyle,
      center: [144.97, -37.805], // Default center (Melbourne)
      zoom: 15,
    });

    mapRef.current = map;

    // Wait for map to load
    map.on('load', () => {
      console.log('✅ Map loaded successfully with style:', currentStyle);

      // Add 3D buildings layer if style supports it
      if (supports3DBuildings(currentStyle)) {
        add3DBuildingsLayer(map);
      }

      setMapLoaded(true);
      setLoading(false);
    });

    map.on('error', (e) => {
      console.error('❌ Map error:', e);
      setError('Failed to load map');
      setLoading(false);
    });

    // Cleanup on unmount
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // Only run once on mount

  // Handle style changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;

    // Change map style
    map.setStyle(currentStyle);

    // Wait for style to load, then re-add 3D buildings if supported
    map.once('style.load', () => {
      console.log('✅ Style changed to:', currentStyle);

      if (supports3DBuildings(currentStyle)) {
        add3DBuildingsLayer(map);
      }
    });
  }, [currentStyle, mapLoaded]);

  // Function to add 3D buildings layer
  const add3DBuildingsLayer = (map) => {
    // Check if layer already exists
    if (map.getLayer('3d-buildings')) {
      return;
    }

    // Check if the required source exists
    const source = map.getSource('composite');
    if (!source) {
      console.warn('⚠️ Composite source not available for 3D buildings');
      return;
    }

    try {
      // Add the 3D buildings layer
      map.addLayer(BUILDING_3D_LAYER);
      console.log('✅ 3D buildings layer added');
    } catch (err) {
      console.error('❌ Error adding 3D buildings layer:', err);
    }
  };

  if (error) {
    return (
      <div className="map-section" style={{ height: `${height}px` }}>
        <div className="map-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="map-section" style={{ height: `${height}px` }}>
      {loading && (
        <div className="map-loading">
          <div className="spinner" />
          <p>Loading map...</p>
        </div>
      )}
      <div
        ref={mapContainerRef}
        className="map-container"
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
};

export default MapSection;
