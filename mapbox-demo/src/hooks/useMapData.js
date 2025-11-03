import { useState, useEffect } from 'react';
import { fetchRealmObservations, calculateCenter, calculateBounds } from '../services/api';
import { observationsToGeoJSON } from '../utils/dataParser';

/**
 * Custom hook for fetching and managing map data
 * @param {number} realmId
 * @param {number} limit
 * @returns {Object} { observations, geojson, center, bounds, loading, error, refetch }
 */
export const useMapData = (realmId, limit = 20) => {
  const [observations, setObservations] = useState([]);
  const [geojson, setGeojson] = useState(null);
  const [center, setCenter] = useState(null);
  const [bounds, setBounds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchRealmObservations(realmId, limit, true);

      if (!result.success) {
        throw new Error(result.error);
      }

      const obs = result.data;
      setObservations(obs);

      // Transform to GeoJSON for Mapbox
      const geoData = observationsToGeoJSON(obs);
      setGeojson(geoData);

      // Calculate center and bounds
      const centerPoint = calculateCenter(obs);
      setCenter(centerPoint);

      const boundsBox = calculateBounds(obs);
      setBounds(boundsBox);

      console.log('✅ Map data processed:', {
        observations: obs.length,
        center: centerPoint,
      });

    } catch (err) {
      console.error('❌ Error loading map data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (realmId) {
      fetchData();
    }
  }, [realmId, limit]);

  return {
    observations,
    geojson,
    center,
    bounds,
    loading,
    error,
    refetch: fetchData,
  };
};
