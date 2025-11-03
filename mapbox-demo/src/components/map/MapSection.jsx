import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { config } from '../../config';
import { supports3DBuildings, BUILDING_3D_LAYER, MAP_STYLES, MAP_STYLE_INFO } from '../../utils/mapConfig';
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
  const currentPopupRef = useRef(null);
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
      zoom: 15,
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
          add3DBuildingsLayer(mapInstance);
        }
        setStyleLoaded(true);
      }, 500);
    });

    mapInstance.on('error', () => {
      // Log errors silently or handle them appropriately
    });

    // Cleanup
    return () => {
      // Close any open popup
      if (currentPopupRef.current) {
        currentPopupRef.current.remove();
        currentPopupRef.current = null;
      }
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

    // Add boundary layer if we have bounds
    if (bounds) {
      addBoundaryLayer(map, bounds);
    }

    // Add observation markers with clustering
    addObservationMarkers(map, observations);

    // Fit map to bounds with padding (only if we have bounds)
    if (bounds && center) {
      map.fitBounds(bounds, {
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
          add3DBuildingsLayer(map);
        }

        // Re-add boundary layer if we have bounds
        if (bounds) {
          addBoundaryLayer(map, bounds);
        }

        // Re-add markers
        if (observations.length > 0) {
          addObservationMarkers(map, observations);
        }

        setStyleLoaded(true);
      }, 500);
    });
  }, [currentStyle, mapLoaded, observations, bounds]);

  /**
   * Adds a visual boundary layer to the map showing the observation area
   * @param {mapboxgl.Map} map - The Mapbox map instance
   * @param {Array} bounds - Array of [[minLng, minLat], [maxLng, maxLat]]
   */
  const addBoundaryLayer = (map, bounds) => {
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
   */
  const add3DBuildingsLayer = (map) => {
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
          add3DBuildingsLayer(map);
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

  /**
   * Loads an image from URL and converts it to base64 format
   * @param {string} url - The image URL to load
   * @returns {Promise<string>} Base64 encoded image data
   */
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

  /**
   * Creates a custom teardrop-shaped SVG marker with an embedded category image
   * @param {string} imageBase64 - Base64 encoded image data
   * @param {string} category - Category name for unique ID generation
   * @param {number} size - Size of the marker in pixels (default: 60)
   * @returns {string} SVG markup as string
   */
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

          img.onerror = () => {
            // Failed to load marker image, silently continue
            resolve();
          };

          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        } catch (error) {
          // Failed to process image, silently continue
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
          iconName: `category-${(obs.category || 'Other').toLowerCase().replace(/\s+/g, '-')}`,
          categoryIconUrl: CATEGORY_ICONS[obs.category] || CATEGORY_ICONS['Other Life'],
          observedAt: obs.observed_at || obs.created_at || null,
          bioscore: obs.bioscore || null
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
        'icon-allow-overlap': false,
        'icon-anchor': 'bottom',
        'icon-offset': [0, -5]
      },
      paint: {
        'icon-opacity': 1
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
            zoom: zoom,
            pitch: 45 // Preserve the 45-degree tilt
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

      // Close existing popup if any
      if (currentPopupRef.current) {
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
          className: 'custom-popup'
        })
          .setLngLat(coordinates)
          .setHTML(popupHTML)
          .addTo(map);

        // Store reference to the popup
        currentPopupRef.current = popup;
      }, 100);
    });
  };

  // Helper function to get bioscore color (red to yellow to green gradient)
  const getBioscoreColor = (score) => {
    if (score === null || score === undefined) return '#9ca3af'; // Gray for no score

    // Assuming bioscore is 0-100 scale
    // 0-40: red to yellow
    // 40-100: yellow to green
    if (score < 40) {
      // Red to yellow gradient (0-40)
      const ratio = score / 40;
      const red = 239; // #ef4444 red component
      const green = Math.round(68 + (234 - 68) * ratio); // Interpolate from 68 to 234
      return `rgb(${red}, ${green}, 68)`;
    } else {
      // Yellow to green gradient (40-100)
      const ratio = (score - 40) / 60;
      const red = Math.round(234 - (234 - 34) * ratio); // Interpolate from 234 to 34
      const green = Math.round(179 + (197 - 179) * ratio); // Interpolate from 179 to 197
      return `rgb(${red}, ${green}, 94)`;
    }
  };

  // Helper function to format date
  const formatObservedDate = (dateString) => {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now - date;
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      // Use relative time for recent observations
      if (diffInDays === 0) {
        return 'Today';
      } else if (diffInDays === 1) {
        return 'Yesterday';
      } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
      } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
      } else {
        // Use formatted date for older observations
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch (error) {
      return null;
    }
  };

  // Function to create popup HTML
  const createPopupHTML = (props) => {
    const { commonName, scientificName, category, creatorName, imageUrl, imageThumbnail, categoryIconUrl, observedAt, bioscore } = props;

    // Format the species name
    let titleHTML = '';
    if (commonName && scientificName) {
      titleHTML = `${commonName} <span style="color: #6b7280;">(<i>${scientificName}</i>)</span>`;
    } else if (commonName) {
      titleHTML = commonName;
    } else if (scientificName) {
      titleHTML = `<i>${scientificName}</i>`;
    } else {
      titleHTML = 'Unknown Species';
    }

    // Build the HTML
    let html = '';

    // Add image if available, otherwise use category icon as placeholder
    if (imageThumbnail || imageUrl) {
      const imgSrc = imageThumbnail || imageUrl;
      html += `<img src="${imgSrc}" alt="${commonName || scientificName || 'Observation'}" class="popup-image" onerror="this.style.display='none'"/>`;
    } else if (categoryIconUrl) {
      // Use category icon as placeholder
      html += `<div class="popup-placeholder-container">
        <img src="${categoryIconUrl}" alt="${category}" class="popup-placeholder-image"/>
      </div>`;
    }

    // Add content
    html += `<div class="popup-content">`;
    html += `<div class="popup-title">${titleHTML}</div>`;
    if (category) {
      html += `<div class="popup-category">${category}</div>`;
    }

    // Add observation time
    const formattedDate = formatObservedDate(observedAt);
    if (formattedDate) {
      html += `<div class="popup-observed">Observed ${formattedDate}</div>`;
    }

    // Add bioscore with color gradient
    if (bioscore !== null && bioscore !== undefined) {
      const color = getBioscoreColor(bioscore);
      html += `<div class="popup-bioscore">
        <div class="popup-bioscore-label">Bioscore</div>
        <div class="popup-bioscore-bar">
          <div class="popup-bioscore-fill" style="width: ${bioscore}%; background-color: ${color};"></div>
        </div>
        <div class="popup-bioscore-value" style="color: ${color};">${bioscore}</div>
      </div>`;
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
