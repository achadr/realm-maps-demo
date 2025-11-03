import axios from 'axios';
import { config } from '../config';

/**
 * API Service for Guardians of Earth
 */

const api = axios.create({
  baseURL: config.api.baseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch realm observations
 * @param {number} realmId - Realm ID
 * @param {number} limit - Number of observations to fetch
 * @param {boolean} withImages - Include images
 * @returns {Promise<Object>} Realm data with observations
 */
export const fetchRealmObservations = async (
  realmId,
  limit = 20,
  withImages = true
) => {
  try {
    const response = await api.get(
      `/contest/109/regions/${realmId}/observations`,
      {
        params: {
          limit,
          with_images: withImages,
        },
      }
    );

    console.log(`✅ Fetched ${response.data.length} observations for realm ${realmId}`);
    return {
      success: true,
      data: response.data,
      count: response.data.length,
    };
  } catch (error) {
    console.error('❌ Error fetching realm observations:', error);

    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
};

/**
 * Calculate center point from observations
 * @param {Array} observations - Array of observations with lat/lng
 * @returns {Object} Center coordinates {lng, lat}
 */
export const calculateCenter = (observations) => {
  if (!observations || observations.length === 0) {
    return { lng: 144.97, lat: -37.805 }; // Default Melbourne
  }

  const sum = observations.reduce(
    (acc, obs) => ({
      lat: acc.lat + obs.lat,
      lng: acc.lng + obs.lng,
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lng: sum.lng / observations.length,
    lat: sum.lat / observations.length,
  };
};

/**
 * Calculate bounding box from observations
 * @param {Array} observations - Array of observations
 * @returns {Array} Bounding box [[minLng, minLat], [maxLng, maxLat]]
 */
export const calculateBounds = (observations) => {
  if (!observations || observations.length === 0) {
    return null;
  }

  const lngs = observations.map(obs => obs.lng);
  const lats = observations.map(obs => obs.lat);

  return [
    [Math.min(...lngs), Math.min(...lats)], // Southwest
    [Math.max(...lngs), Math.max(...lats)], // Northeast
  ];
};

export default api;
