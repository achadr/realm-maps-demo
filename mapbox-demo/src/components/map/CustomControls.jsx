import mapboxgl from 'mapbox-gl';

/**
 * Advanced Map Style Switcher Control with Dropdown
 * Supports multiple map styles including 3D buildings
 */
export class StyleSwitcherControl {
  constructor(styles, styleInfo, onStyleChange, initialStyle) {
    this.styles = styles;
    this.styleInfo = styleInfo;
    this.onStyleChange = onStyleChange;
    // Find the current style key from the URL
    this.currentStyleKey = Object.keys(styles).find(key => styles[key] === initialStyle) || 'STREETS';
    this.isOpen = false;
  }

  onAdd(map) {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl style-switcher-control';

    // Create button
    this.button = document.createElement('button');
    this.button.className = 'style-switcher-btn';
    this.button.type = 'button';
    this.button.title = 'Change map style';
    this.button.innerHTML = `
      <span class="style-icon">${this.styleInfo[this.currentStyleKey].icon}</span>
    `;

    // Create dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'style-switcher-dropdown';
    this.dropdown.style.display = 'none';

    // Populate dropdown with style options
    Object.keys(this.styles).forEach(styleKey => {
      const info = this.styleInfo[styleKey];
      if (!info) return; // Skip if no metadata

      const option = document.createElement('button');
      option.className = 'style-option';
      option.dataset.styleKey = styleKey;

      // Add active class if this is the current style
      if (styleKey === this.currentStyleKey) {
        option.classList.add('style-option-active');
      }

      option.innerHTML = `
        <span class="style-option-icon">${info.icon}</span>
        <div class="style-option-text">
          <div class="style-option-name">${info.name}</div>
          <div class="style-option-desc">${info.description}</div>
        </div>
        <span class="style-option-checkmark">✓</span>
      `;

      option.onclick = () => {
        this.selectStyle(styleKey);
      };

      this.dropdown.appendChild(option);
    });

    // Toggle dropdown
    this.button.onclick = (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    };

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      if (this.isOpen) {
        this.closeDropdown();
      }
    });

    this.container.appendChild(this.button);
    this.container.appendChild(this.dropdown);
    return this.container;
  }

  toggleDropdown() {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown() {
    this.dropdown.style.display = 'block';
    this.isOpen = true;
  }

  closeDropdown() {
    this.dropdown.style.display = 'none';
    this.isOpen = false;
  }

  selectStyle(styleKey) {
    // Remove active class from all options
    const allOptions = this.dropdown.querySelectorAll('.style-option');
    allOptions.forEach(opt => opt.classList.remove('style-option-active'));

    // Add active class to selected option
    const selectedOption = this.dropdown.querySelector(`[data-style-key="${styleKey}"]`);
    if (selectedOption) {
      selectedOption.classList.add('style-option-active');
    }

    this.currentStyleKey = styleKey;
    const info = this.styleInfo[styleKey];
    if (!info) return;

    this.button.innerHTML = `
      <span class="style-icon">${info.icon}</span>
    `;

    // Call the style change handler
    if (this.onStyleChange) {
      this.onStyleChange(this.styles[styleKey]);
    }

    this.closeDropdown();
  }

  onRemove() {
    this.container.parentNode.removeChild(this.container);
    this.map = undefined;
  }
}
