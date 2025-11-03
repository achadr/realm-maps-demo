/**
 * Parse and transform observation data for Mapbox
 */

/**
 * Transform observations to GeoJSON format
 * @param {Array} observations - Raw observations from API
 * @returns {Object} GeoJSON FeatureCollection
 */
export const observationsToGeoJSON = (observations) => {
  return {
    type: 'FeatureCollection',
    features: observations.map((obs) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [obs.lng, obs.lat],
      },
      properties: {
        id: obs.id,
        category: obs.category || 'Other',
        commonName: obs.common_name || null,
        scientificName: obs.scientific_name || null,
        creatorName: obs.creator_name || 'Unknown',
        imageUrl: obs.images?.[0]?.url || null,
        imageThumbnail: obs.images?.[0]?.url_thumbnail || null,
        bioscore: obs.bioscore || 0,
        observedAt: obs.observed_at || null,
      },
    })),
  };
};

/**
 * Group observations by category
 * @param {Array} observations
 * @returns {Object} Grouped by category
 */
export const groupByCategory = (observations) => {
  return observations.reduce((acc, obs) => {
    const category = obs.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(obs);
    return acc;
  }, {});
};

/**
 * Get unique categories from observations
 * @param {Array} observations
 * @returns {Array} Array of unique categories
 */
export const getUniqueCategories = (observations) => {
  const categories = observations
    .map(obs => obs.category)
    .filter(Boolean);
  return [...new Set(categories)];
};
