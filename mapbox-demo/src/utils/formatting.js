/**
 * Format species names according to client requirements
 */

/**
 * Format species name for display
 * @param {Object} observation
 * @returns {string} Formatted name (HTML safe)
 */
export const formatSpeciesName = (observation) => {
  const { common_name, scientific_name } = observation;

  if (common_name && scientific_name) {
    return `${common_name} (${scientific_name})`;
  } else if (common_name) {
    return common_name;
  } else if (scientific_name) {
    return scientific_name;
  }
  return 'Unknown Species';
};

/**
 * Format species name with HTML (for italics)
 * @param {Object} observation
 * @returns {string} HTML string
 */
export const formatSpeciesNameHTML = (observation) => {
  const { common_name, scientific_name } = observation;

  if (common_name && scientific_name) {
    return `${common_name} (<i>${scientific_name}</i>)`;
  } else if (common_name) {
    return common_name;
  } else if (scientific_name) {
    return `<i>${scientific_name}</i>`;
  }
  return 'Unknown Species';
};

/**
 * Format spotter attribution
 * @param {string} creatorName
 * @returns {string}
 */
export const formatSpotter = (creatorName) => {
  return `Spotted by ${creatorName || 'Unknown'}`;
};

/**
 * Format date
 * @param {string} dateString
 * @returns {string}
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return dateString;
  }
};
