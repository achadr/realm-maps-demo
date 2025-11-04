/**
 * Utility functions for creating and formatting map popups
 */

/**
 * Helper function to get bioscore color (red to yellow to green gradient)
 * @param {number} score - The bioscore value (0-100)
 * @returns {string} RGB color string
 */
export const getBioscoreColor = (score) => {
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

/**
 * Helper function to format date
 * @param {string} dateString - ISO date string
 * @returns {string|null} Formatted date string or null
 */
export const formatObservedDate = (dateString) => {
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

/**
 * Function to create popup HTML
 * @param {Object} props - Observation properties
 * @returns {string} HTML string for popup
 */
export const createPopupHTML = (props) => {
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
