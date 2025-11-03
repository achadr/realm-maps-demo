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

  // Function to load image and convert to base64
  const loadImageAsBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        try {
          const base64 = canvas.toDataURL('image/png');
          resolve(base64);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  // Function to create teardrop SVG marker with embedded image
  const createTearDropMarkerSVG = (imageBase64, category, size = 60) => {
    // Generate unique IDs for this marker's definitions
    const uniqueId = category.toLowerCase().replace(/\s+/g, '-');
    return `
      <svg width="${size}" height="${size * 1.2}" viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow-${uniqueId}" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <clipPath id="circle-clip-${uniqueId}">
            <circle cx="25" cy="20" r="15"/>
          </clipPath>
          <linearGradient id="pin-gradient-${uniqueId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#000000;stop-opacity:0.1" />
          </linearGradient>
        </defs>

        <!-- Drop shadow -->
        <ellipse cx="25" cy="56" rx="8" ry="3" fill="black" opacity="0.3"/>

        <!-- Teardrop shape with gradient -->
        <path d="M25,2 C15,2 8,9 8,19 C8,29 25,50 25,50 C25,50 42,29 42,19 C42,9 35,2 25,2 Z"
              fill="#ef4444"
              stroke="white"
              stroke-width="2.5"
              filter="url(#shadow-${uniqueId})"/>

        <!-- Inner white border -->
        <circle cx="25" cy="20" r="16" fill="white"/>

        <!-- Category image clipped to circle -->
        <image href="${imageBase64}"
               x="10" y="5"
               width="30" height="30"
               clip-path="url(#circle-clip-${uniqueId})"
               preserveAspectRatio="xMidYMid slice"/>

        <!-- Glossy overlay effect -->
        <circle cx="25" cy="20" r="15" fill="url(#pin-gradient-${uniqueId})" opacity="0.4"/>

        <!-- Outer circle border -->
        <circle cx="25" cy="20" r="15" fill="none" stroke="#e5e7eb" stroke-width="1" opacity="0.8"/>
      </svg>
    `;
  };

  // Function to load category images as custom teardrop markers
  const loadCategoryIcons = async (map) => {
    const loadPromises = Object.entries(CATEGORY_ICONS).map(([category, url]) => {
      return new Promise(async (resolve) => {
        const iconName = `category-${category.toLowerCase().replace(/\s+/g, '-')}`;

        // Check if already loaded
        if (map.hasImage(iconName)) {
          resolve();
          return;
        }

        try {
          // Load the category image as base64
          const imageBase64 = await loadImageAsBase64(url);

          // Create teardrop marker SVG with the base64 image
          const svg = createTearDropMarkerSVG(imageBase64, category);
          const img = new Image(50, 60);

          img.onload = () => {
            if (!map.hasImage(iconName)) {
              map.addImage(iconName, img, { sdf: false });
            }
            resolve();
          };

          img.onerror = (error) => {
            console.warn(`Failed to load marker for ${category}:`, error);
            resolve();
          };

          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        } catch (error) {
          console.warn(`Failed to process image for ${category}:`, error);
          resolve();
        }
      });
    });

    await Promise.all(loadPromises);
  };

  // Function to add observation markers with clustering
  const addObservationMarkers = async (map, observations) => {
    // Remove existing source and layers if they exist
    if (map.getSource('observations')) {
      if (map.getLayer('clusters')) map.removeLayer('clusters');
      if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
      if (map.getLayer('unclustered-point')) map.removeLayer('unclustered-point');
      map.removeSource('observations');
    }

    // Load category icons first
    await loadCategoryIcons(map);

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
          iconName: `category-${(obs.category || 'Other').toLowerCase().replace(/\s+/g, '-')}`
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

    // Add cluster circles with gradient effect
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
        'text-size': 14
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(0, 0, 0, 0.3)',
        'text-halo-width': 1
      }
    }, beforeId);

    // Add individual teardrop markers with custom category icons
    map.addLayer({
      id: 'unclustered-point',
      type: 'symbol',
      source: 'observations',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': ['get', 'iconName'],
        'icon-size': 0.8,
        'icon-allow-overlap': false,
        'icon-anchor': 'bottom',
        'icon-offset': [0, -5]
      },
      paint: {
        'icon-opacity': 1
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
