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
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [currentStyle, setCurrentStyle] = useState(initialStyle);
  const isInitialMount = useRef(true);

  // Fetch map data using custom hook
  const { observations, center, bounds, loading, error } = useMapData(realmId);

  // Initialize map
  useEffect(() => {
    if (!mapboxgl.accessToken || !mapContainerRef.current) {
      return;
    }

    // Create a map instance
    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      ...DEFAULT_MAP_CONFIG,
      style: currentStyle,
      center: [144.97, -37.805], // Default center (Melbourne)
      zoom: 15,
    });

    mapRef.current = mapInstance;

    mapInstance.once('load', () => {
      console.log('✅ Map loaded successfully');

      // Add controls
      const navControl = new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      });
      mapInstance.addControl(navControl, 'top-right');

      const fullscreenControl = new mapboxgl.FullscreenControl();
      mapInstance.addControl(fullscreenControl, 'top-right');

      const styleSwitcher = new StyleSwitcherControl(
        MAP_STYLES,
        MAP_STYLE_INFO,
        (newStyleUrl) => setCurrentStyle(newStyleUrl)
      );
      mapInstance.addControl(styleSwitcher, 'top-left');

      setMapLoaded(true);

      // Add 3D buildings after a small delay to ensure composite source is ready
      setTimeout(() => {
        if (supports3DBuildings(currentStyle)) {
          add3DBuildingsLayer(mapInstance);
        }
        setStyleLoaded(true);
      }, 500);
    });

    mapInstance.on('error', (e) => {
      console.error('❌ Map error:', e);
    });

    // Cleanup
    return () => {
      mapInstance.remove();
      mapRef.current = null;
    };
  }, []); // Only run once on mount

  // Update map when data is loaded
  useEffect(() => {
    console.log('📊 Data effect triggered:', {
      hasMap: !!mapRef.current,
      mapLoaded,
      styleLoaded,
      observationsCount: observations.length,
      hasCenter: !!center,
      hasBounds: !!bounds
    });

    if (!mapRef.current) {
      console.log('⏭️ Skipping: No map ref');
      return;
    }

    if (!mapLoaded || !styleLoaded) {
      console.log('⏭️ Skipping: Map or style not loaded yet');
      return;
    }

    if (observations.length === 0) {
      console.log('⏭️ Skipping: No observations yet');
      return;
    }

    const map = mapRef.current;

    console.log('🔄 Adding markers for', observations.length, 'observations');

    // Add observation markers with clustering
    addObservationMarkers(map, observations);

    // Fit map to bounds with padding (only if we have bounds)
    if (bounds && center) {
      map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 16,
        duration: 1000,
      });
      console.log('✅ Map centered on realm:', center);
    } else if (center) {
      // Fallback to center
      map.flyTo({
        center: [center.lng, center.lat],
        zoom: 15,
        duration: 1000,
      });
      console.log('✅ Map centered on point:', center);
    }
  }, [mapLoaded, styleLoaded, center, bounds, observations]);

  // Handle style changes
  useEffect(() => {
    // Skip on initial mount (style is already set during map initialization)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;
    setStyleLoaded(false);

    // Save current camera position before style change
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const currentPitch = map.getPitch();
    const currentBearing = map.getBearing();

    console.log('💾 Saving camera position:', {
      center: currentCenter,
      zoom: currentZoom,
      pitch: currentPitch,
      bearing: currentBearing
    });

    // Change map style
    map.setStyle(currentStyle);

    // Wait for style to load
    map.once('style.load', () => {
      console.log('✅ New style loaded, restoring camera');

      // Restore camera position
      map.jumpTo({
        center: currentCenter,
        zoom: currentZoom,
        pitch: currentPitch,
        bearing: currentBearing
      });

      // Add 3D buildings and markers with delay to ensure composite source is ready
      setTimeout(() => {
        if (supports3DBuildings(currentStyle)) {
          add3DBuildingsLayer(map);
        }

        // Re-add markers
        if (observations.length > 0) {
          addObservationMarkers(map, observations);
        }

        setStyleLoaded(true);
      }, 500);
    });
  }, [currentStyle, mapLoaded, observations]);

  // Function to add 3D buildings layer
  const add3DBuildingsLayer = (map) => {
    // Check if current style has built-in 3D buildings (e.g., Standard style)
    const styleKey = Object.keys(MAP_STYLES).find(
      key => MAP_STYLES[key] === currentStyle
    );
    if (styleKey && MAP_STYLE_INFO[styleKey]?.hasBuiltIn3D) {
      console.log('✅ Style has built-in 3D buildings, skipping custom layer');
      return;
    }

    // Check if layer already exists
    if (map.getLayer('3d-buildings')) {
      console.log('✅ 3D buildings layer already exists');
      return;
    }

    // Check composite source - but with a more robust check
    const source = map.getSource('composite');
    if (!source) {
      console.warn('⚠️ Composite source not available, will retry');
      // Schedule a retry - composite may not be ready yet
      setTimeout(() => {
        if (map.getSource('composite')) {
          add3DBuildingsLayer(map);
        }
      }, 100);
      return;
    }

    try {
      // Add the 3D buildings layer
      map.addLayer(BUILDING_3D_LAYER);
      console.log('✅ 3D buildings layer added successfully');
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

    // Determine the beforeId - insert markers before 3D buildings layer
    const beforeId = map.getLayer('3d-buildings') ? '3d-buildings' : undefined;

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
    }, beforeId);

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
    }, beforeId);

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
    }, beforeId);

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

      // Zoom to the marker with smooth animation
      map.flyTo({
        center: coordinates,
        zoom: Math.max(map.getZoom(), 18), // Zoom to at least level 18 for close-up view
        duration: 800,
        essential: true
      });

      // Create popup HTML
      const popupHTML = createPopupHTML(props);

      // Add popup after a short delay to let zoom animation start
      setTimeout(() => {
        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(popupHTML)
          .addTo(map);
      }, 100);
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
