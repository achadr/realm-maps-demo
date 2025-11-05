import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { config } from '../../config';
import { supports3DBuildings, MAP_STYLES, MAP_STYLE_INFO } from '../../utils/mapConfig';
import { useMapData } from '../../hooks/useMapData';
import { StyleSwitcherControl } from './CustomControls';
import { createPopupHTML } from '../../utils/mapPopupUtils';
import { loadCategoryIcons } from '../../utils/mapMarkerUtils';
import { addBoundaryLayer, addBoundaryLayerFromPolygon, removeBoundaryLayer, add3DBuildingsLayer, stopBoundaryAnimation } from '../../utils/mapLayerUtils';
import '../../styles/map.css';
import '../../styles/controls.css';

// Set Mapbox token globally
mapboxgl.accessToken = config.mapbox.token;

// Category icon mapping
const CATEGORY_ICONS = {
  'Amphibians': 'https://api.questagame.com/images/uploads/category/24/thumb_1-amphibian.jpeg',
  'Arachnids': 'https://api.questagame.com/images/uploads/category/18/thumb_4-spider.jpg',
  'Birds': 'https://api.questagame.com/images/uploads/category/17/thumb_0-bird.jpg',
  'Crustaceans': 'https://api.questagame.com/images/uploads/category/22/thumb_10-lobster.png',
  'Fish': 'https://api.questagame.com/images/uploads/category/31/thumb_14-fish.png',
  'Fungi and Friends': 'https://api.questagame.com/images/uploads/category/27/thumb_5-fungi.jpg',
  'Insects - Ants, Bees and Wasps': 'https://api.questagame.com/images/uploads/category/35/thumb_ant.png',
  'Insects - Beetles': 'https://api.questagame.com/images/uploads/category/34/thumb_imgres.png',
  'Insects - Butterflies and Moths': 'https://api.questagame.com/images/uploads/category/26/thumb_images.png',
  'Insects - Flies': 'https://api.questagame.com/images/uploads/category/36/thumb_flies.png',
  'Mammals': 'https://api.questagame.com/images/uploads/category/23/thumb_3-mammal.png',
  'Other Arthropods': 'https://api.questagame.com/images/uploads/category/19/thumb_7-centipede.jpg',
  'Other Insects': 'https://api.questagame.com/images/uploads/category/20/thumb_8-hopping_insect.png',
  'Other Invertebrates': 'https://api.questagame.com/images/uploads/category/21/thumb_12-gastropods.jpg',
  'Other Life': 'https://api.questagame.com/images/uploads/category/37/thumb_unnamed.jpg',
  'Plants that do not flower': 'https://api.questagame.com/images/uploads/category/28/thumb_6-fern.jpg',
  'Plants that flower': 'https://api.questagame.com/images/uploads/category/29/thumb_13-floweringplant.png',
  'Reptiles': 'https://api.questagame.com/images/uploads/category/25/thumb_2-reptile.jpg',
};

/**
 * MapSection - Embedded map component (section-based, not fullscreen)
 * @param {number} realmId - ID of the realm to display
 * @param {number} height - Height in pixels (default: 600)
 * @param {Object} polygon - Optional polygon geometry for boundary (GeoJSON Polygon format)
 */
const MapSection = ({ realmId = 12436, height = 600, initialStyle = MAP_STYLES.STREETS, polygon = null }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const currentPopupRef = useRef(null);
  const eventHandlersRef = useRef({}); // Store event handler references
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
      style: currentStyle,
      center: [144.97, -37.805], // Default center (Melbourne)
      zoom: 10,
      pitch: 45, // 45-degree tilt for 3D view
      bearing: 0,
      antialias: true,
      attributionControl: true,
      logoPosition: 'bottom-left',
    });

    mapRef.current = mapInstance;

    mapInstance.once('load', () => {
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
        (newStyleUrl) => setCurrentStyle(newStyleUrl),
        currentStyle
      );
      mapInstance.addControl(styleSwitcher, 'top-left');

      setMapLoaded(true);

      // Add 3D buildings after a small delay to ensure composite source is ready
      setTimeout(() => {
        if (supports3DBuildings(currentStyle)) {
          add3DBuildingsLayer(mapInstance, currentStyle);
        }
        setStyleLoaded(true);
      }, 500);
    });

    mapInstance.on('error', () => {
      // Log errors silently or handle them appropriately
    });

    // Cleanup
    return () => {
      // Stop boundary animations before removing map
      stopBoundaryAnimation();

      // Close any open popup
      if (currentPopupRef.current) {
        currentPopupRef.current.remove();
        currentPopupRef.current = null;
      }

      // Remove all event handlers using stored references
      const handlers = eventHandlersRef.current;
      if (handlers.clusterClick) mapInstance.off('click', 'clusters', handlers.clusterClick);
      if (handlers.clusterMouseEnter) mapInstance.off('mouseenter', 'clusters', handlers.clusterMouseEnter);
      if (handlers.clusterMouseLeave) mapInstance.off('mouseleave', 'clusters', handlers.clusterMouseLeave);
      if (handlers.markerClick) mapInstance.off('click', 'unclustered-point', handlers.markerClick);
      if (handlers.markerMouseEnter) mapInstance.off('mouseenter', 'unclustered-point', handlers.markerMouseEnter);
      if (handlers.markerMouseLeave) mapInstance.off('mouseleave', 'unclustered-point', handlers.markerMouseLeave);

      mapInstance.remove();
      mapRef.current = null;
    };
  }, []); // Only run once on mount

  // Update map when data is loaded
  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (!mapLoaded || !styleLoaded) {
      return;
    }

    if (observations.length === 0) {
      return;
    }

    const map = mapRef.current;

    // Calculate bounds from polygon if provided
    let polygonBounds = null;
    if (polygon && polygon.coordinates && polygon.coordinates[0]) {
      const coords = polygon.coordinates[0];
      const lngs = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      polygonBounds = [
        [Math.min(...lngs), Math.min(...lats)], // Southwest
        [Math.max(...lngs), Math.max(...lats)]  // Northeast
      ];
    }

    // Add observation markers with clustering first
    addObservationMarkers(map, observations);

    // Add boundary layer after a small delay to ensure map is fully ready
    // Use polygon if provided, otherwise use bounds
    setTimeout(() => {
      if (polygon) {
        addBoundaryLayerFromPolygon(map, polygon);
      } else if (bounds) {
        addBoundaryLayer(map, bounds);
      }
    }, 100);

    // Fit map to bounds with padding - prioritize polygon bounds
    const boundsToUse = polygonBounds || bounds;
    if (boundsToUse) {
      map.fitBounds(boundsToUse, {
        padding: 50,
        maxZoom: 16,
        duration: 1000,
        pitch: 45, // Preserve the 45-degree tilt
      });
    } else if (center) {
      // Fallback to center
      map.flyTo({
        center: [center.lng, center.lat],
        zoom: 15,
        duration: 1000,
        pitch: 45, // Preserve the 45-degree tilt
      });
    }
  }, [mapLoaded, styleLoaded, center, bounds, observations, polygon]);

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

    // Clean up boundary animations before style change
    // (layers will be removed automatically when style changes)
    stopBoundaryAnimation();

    // Save current camera position before style change
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const currentPitch = map.getPitch();
    const currentBearing = map.getBearing();

    // Change map style
    map.setStyle(currentStyle);

    // Wait for style to load
    map.once('style.load', () => {
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
          add3DBuildingsLayer(map, currentStyle);
        }

        // Re-add boundary layer - use polygon if provided, otherwise use bounds
        if (polygon) {
          addBoundaryLayerFromPolygon(map, polygon);
        } else if (bounds) {
          addBoundaryLayer(map, bounds);
        }

        // Re-add markers
        if (observations.length > 0) {
          addObservationMarkers(map, observations);
        }

        setStyleLoaded(true);
      }, 500);
    });
  }, [currentStyle, mapLoaded, observations, bounds, polygon]);

  // Function to add observation markers with clustering
  const addObservationMarkers = async (map, observations) => {
    // Remove existing event handlers using stored references
    const handlers = eventHandlersRef.current;
    console.log('[MapSection] Removing old event handlers:', Object.keys(handlers));
    if (handlers.clusterClick) map.off('click', 'clusters', handlers.clusterClick);
    if (handlers.clusterMouseEnter) map.off('mouseenter', 'clusters', handlers.clusterMouseEnter);
    if (handlers.clusterMouseLeave) map.off('mouseleave', 'clusters', handlers.clusterMouseLeave);
    if (handlers.markerClick) map.off('click', 'unclustered-point', handlers.markerClick);
    if (handlers.markerMouseEnter) map.off('mouseenter', 'unclustered-point', handlers.markerMouseEnter);
    if (handlers.markerMouseLeave) map.off('mouseleave', 'unclustered-point', handlers.markerMouseLeave);

    // Clear the handlers object
    eventHandlersRef.current = {};
    console.log('[MapSection] Event handlers cleared');

    // Close any existing popup when re-adding markers
    if (currentPopupRef.current) {
      currentPopupRef.current.remove();
      currentPopupRef.current = null;
    }

    // Remove existing source and layers if they exist
    if (map.getSource('observations')) {
      if (map.getLayer('clusters')) map.removeLayer('clusters');
      if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
      if (map.getLayer('unclustered-point')) map.removeLayer('unclustered-point');
      map.removeSource('observations');
    }

    // Load category icons first
    await loadCategoryIcons(map, CATEGORY_ICONS);

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
          iconName: `category-${(obs.category || 'Other').toLowerCase().replace(/\s+/g, '-')}`,
          categoryIconUrl: CATEGORY_ICONS[obs.category] || CATEGORY_ICONS['Other Life'],
          observedAt: obs.observed_at || obs.created_at || null,
          bioscore: obs.bioscore || null
        }
      }))
    };

    // Add source with clustering enabled
    // Clusters visible only at zoom 10 and below
    map.addSource('observations', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 10, // Stop clustering above zoom 10
      clusterRadius: 50
    });

    // Add cluster circles with gradient effect (no beforeId - render on top)
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'observations',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#22c55e',  // Green for small clusters
          10,
          '#3b82f6', // Blue for medium
          30,
          '#a855f7'  // Purple for large
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          22,   // Small clusters
          10,
          32,   // Medium clusters
          30,
          42    // Large clusters
        ],
        'circle-opacity': 0.9,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.8
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
        'text-size': 14
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(0, 0, 0, 0.3)',
        'text-halo-width': 1
      }
    });

    // Add individual teardrop markers with custom category icons
    map.addLayer({
      id: 'unclustered-point',
      type: 'symbol',
      source: 'observations',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': ['get', 'iconName'],
        'icon-size': 0.8,
        'icon-allow-overlap': true, // Allow markers to overlap so all are visible
        'icon-ignore-placement': true, // Don't hide markers due to placement collisions
        'icon-anchor': 'bottom',
        'icon-offset': [0, -5]
      },
      paint: {
        'icon-opacity': 1
      }
    });

    // Create and store event handler functions
    const clusterClickHandler = (e) => {
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
            zoom: zoom,
            pitch: 45 // Preserve the 45-degree tilt
          });
        }
      );
    };

    const clusterMouseEnterHandler = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const clusterMouseLeaveHandler = () => {
      map.getCanvas().style.cursor = '';
    };

    const markerMouseEnterHandler = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const markerMouseLeaveHandler = () => {
      map.getCanvas().style.cursor = '';
    };

    // Store handlers in ref
    eventHandlersRef.current.clusterClick = clusterClickHandler;
    eventHandlersRef.current.clusterMouseEnter = clusterMouseEnterHandler;
    eventHandlersRef.current.clusterMouseLeave = clusterMouseLeaveHandler;
    eventHandlersRef.current.markerMouseEnter = markerMouseEnterHandler;
    eventHandlersRef.current.markerMouseLeave = markerMouseLeaveHandler;

    // Add event listeners
    map.on('click', 'clusters', clusterClickHandler);
    map.on('mouseenter', 'clusters', clusterMouseEnterHandler);
    map.on('mouseleave', 'clusters', clusterMouseLeaveHandler);
    map.on('mouseenter', 'unclustered-point', markerMouseEnterHandler);
    map.on('mouseleave', 'unclustered-point', markerMouseLeaveHandler);

    // Create marker click handler
    const markerClickHandler = (e) => {
      console.log('[MapSection] Marker clicked - handler executing');
      const coordinates = e.features[0].geometry.coordinates.slice();
      const props = e.features[0].properties;

      // Ensure popup appears over the point
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      // Close existing popup if any
      if (currentPopupRef.current) {
        console.log('[MapSection] Closing existing popup');
        currentPopupRef.current.remove();
        currentPopupRef.current = null;
      }

      // Zoom to the marker with smooth animation
      map.flyTo({
        center: coordinates,
        zoom: Math.max(map.getZoom(), 20), // Zoom to at least level 18 for close-up view
        duration: 800,
        essential: true,
        pitch: 45 // Preserve the 45-degree tilt
      });

      // Create popup HTML
      const popupHTML = createPopupHTML(props);

      // Add popup after a short delay to let zoom animation start
      setTimeout(() => {
        const popup = new mapboxgl.Popup({
          maxWidth: '260px',
          closeOnClick: false,
          closeButton: true,
          className: 'custom-popup'
        })
          .setLngLat(coordinates)
          .setHTML(popupHTML)
          .addTo(map);

        // Store reference to the popup
        currentPopupRef.current = popup;

        // Listen for popup close event to clear reference
        popup.on('close', () => {
          if (currentPopupRef.current === popup) {
            currentPopupRef.current = null;
          }
        });
      }, 100);
    };

    // Store and add marker click handler
    eventHandlersRef.current.markerClick = markerClickHandler;
    map.on('click', 'unclustered-point', markerClickHandler);

    console.log('[MapSection] New event handlers registered:', Object.keys(eventHandlersRef.current));
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
