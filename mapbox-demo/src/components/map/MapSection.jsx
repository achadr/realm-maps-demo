import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { config } from '../../config';
import { DEFAULT_MAP_CONFIG, supports3DBuildings, BUILDING_3D_LAYER, MAP_STYLES, MAP_STYLE_INFO } from '../../utils/mapConfig';
import { useMapData } from '../../hooks/useMapData';
import { StyleSwitcherControl } from './CustomControls';
import '../../styles/map.css';
import '../../styles/controls.css';

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
  const isInitialMount = useRef(true);

  // Fetch map data using custom hook
  const { observations, center, bounds, loading, error } = useMapData(realmId);

  // Initialize map
  useEffect(() => {
    if (!mapboxgl.accessToken || !mapContainerRef.current) {
      return;
    }

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

      // Add built-in controls
      const navControl = new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true, // Enable for 3D view
      });
      map.addControl(navControl, 'top-right');

      const fullscreenControl = new mapboxgl.FullscreenControl();
      map.addControl(fullscreenControl, 'top-right');

      // Add style switcher
      const styleSwitcher = new StyleSwitcherControl(
        MAP_STYLES,
        MAP_STYLE_INFO,
        (newStyleUrl) => setCurrentStyle(newStyleUrl)
      );
      map.addControl(styleSwitcher, 'top-left');

      // Add 3D buildings layer if style supports it
      if (supports3DBuildings(currentStyle)) {
        add3DBuildingsLayer(map);
      }

      setMapLoaded(true);
    });

    map.on('error', (e) => {
      console.error('❌ Map error:', e);
    });

    // Cleanup on unmount
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // Only run once on mount

  // Update map when data is loaded
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !center || !bounds || observations.length === 0) {
      return;
    }

    const map = mapRef.current;

    // Add observation markers with clustering
    addObservationMarkers(map, observations);

    // Fit map to bounds with padding
    if (bounds) {
      map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 16,
        duration: 1000,
      });
    } else {
      // Fallback to center
      map.flyTo({
        center: [center.lng, center.lat],
        zoom: 15,
        duration: 1000,
      });
    }

    console.log('✅ Map centered on realm:', center);
  }, [mapLoaded, center, bounds, observations]);

  // Handle style changes
  useEffect(() => {
    // Skip on initial mount (style is already set during map initialization)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;

    // Change map style
    map.setStyle(currentStyle);

    // Wait for style to load, then re-add 3D buildings and markers
    map.once('style.load', () => {
      console.log('✅ Style changed to:', currentStyle);

      if (supports3DBuildings(currentStyle)) {
        add3DBuildingsLayer(map);
      }

      // Re-add markers after style change
      if (observations.length > 0) {
        addObservationMarkers(map, observations);
      }

      // Re-center on data after style change
      if (bounds) {
        map.fitBounds(bounds, {
          padding: 50,
          maxZoom: 16,
          duration: 1000,
        });
      }
    });
  }, [currentStyle, mapLoaded, bounds, observations]);

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

  // Function to add observation markers with clustering
  const addObservationMarkers = (map, observations) => {
    // Remove existing source and layers if they exist
    if (map.getSource('observations')) {
      if (map.getLayer('clusters')) map.removeLayer('clusters');
      if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
      if (map.getLayer('unclustered-point')) map.removeLayer('unclustered-point');
      map.removeSource('observations');
    }

    // Create GeoJSON from observations
    const geojson = {
      type: 'FeatureCollection',
      features: observations.map(obs => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [obs.lng, obs.lat]
        },
        properties: {
          id: obs.id,
          category: obs.category || 'Other',
          commonName: obs.common_name || null,
          scientificName: obs.scientific_name || null,
          creatorName: obs.creator_name || 'Unknown',
          imageUrl: obs.images?.[0]?.url || null,
          imageThumbnail: obs.images?.[0]?.url_thumbnail || null,
        }
      }))
    };

    // Add source with clustering enabled
    map.addSource('observations', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    // Add cluster circles (blue)
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'observations',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#3b82f6',  // Blue for small clusters
          10,
          '#2563eb', // Darker blue for medium
          30,
          '#1e40af'  // Darkest blue for large
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,   // Small clusters
          10,
          30,   // Medium clusters
          30,
          40    // Large clusters
        ]
      }
    });

    // Add cluster count labels
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'observations',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      },
      paint: {
        'text-color': '#ffffff'
      }
    });

    // Add individual markers (red)
    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'observations',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#ef4444',  // Red for individual markers
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Add click handler for clusters
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters']
      });
      const clusterId = features[0].properties.cluster_id;
      map.getSource('observations').getClusterExpansionZoom(
        clusterId,
        (err, zoom) => {
          if (err) return;

          map.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom
          });
        }
      );
    });

    // Change cursor on hover
    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('mouseenter', 'unclustered-point', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'unclustered-point', () => {
      map.getCanvas().style.cursor = '';
    });

    // Add popup on marker click
    map.on('click', 'unclustered-point', (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();
      const props = e.features[0].properties;

      // Ensure popup appears over the point
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      // Create popup HTML
      const popupHTML = createPopupHTML(props);

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(popupHTML)
        .addTo(map);
    });

    console.log('✅ Added markers with clustering:', observations.length, 'observations');
  };

  // Function to create popup HTML
  const createPopupHTML = (props) => {
    const { commonName, scientificName, category, creatorName, imageUrl, imageThumbnail } = props;

    // Format the species name
    let titleHTML = '';
    if (commonName && scientificName) {
      titleHTML = `${commonName} (<i>${scientificName}</i>)`;
    } else if (commonName) {
      titleHTML = commonName;
    } else if (scientificName) {
      titleHTML = `<i>${scientificName}</i>`;
    } else {
      titleHTML = 'Unknown Species';
    }

    // Build the HTML
    let html = '';

    // Add image if available
    if (imageThumbnail || imageUrl) {
      const imgSrc = imageThumbnail || imageUrl;
      html += `<img src="${imgSrc}" alt="${commonName || scientificName || 'Observation'}" class="popup-image" onerror="this.style.display='none'"/>`;
    }

    // Add content
    html += `<div class="popup-content">`;
    html += `<div class="popup-title">${titleHTML}</div>`;
    if (category) {
      html += `<div class="popup-category">${category}</div>`;
    }
    html += `<div class="popup-spotter">Spotted by ${creatorName}</div>`;
    html += `</div>`;

    return html;
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
          <p>Loading realm data...</p>
          <p className="loading-detail">{observations.length} observations loaded</p>
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
