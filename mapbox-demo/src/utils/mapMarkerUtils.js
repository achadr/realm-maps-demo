/**
 * Utility functions for creating and loading map markers
 */

/**
 * Loads an image from URL and converts it to base64 format
 * @param {string} url - The image URL to load
 * @returns {Promise<string>} Base64 encoded image data
 */
export const loadImageAsBase64 = (url) => {
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
export const createTearDropMarkerSVG = (imageBase64, category, size = 60) => {
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

/**
 * Loads category images as custom teardrop markers
 * @param {mapboxgl.Map} map - The Mapbox map instance
 * @param {Object} categoryIcons - Object mapping category names to icon URLs
 * @returns {Promise<void>}
 */
export const loadCategoryIcons = async (map, categoryIcons) => {
  const loadPromises = Object.entries(categoryIcons).map(([category, url]) => {
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
