# Guardians of Earth - Mapbox Demo

Interactive map application showcasing biodiversity observations with 3D buildings and multiple map styles.

## Features

- **Multiple Map Styles**: Streets 3D, Satellite, Outdoors, Dark 3D, and Light themes
- **3D Buildings**: Immersive building extrusions in urban areas
- **Smart Clustering**: Blue cluster markers that expand on click
- **Individual Markers**: Red markers for single observations
- **Interactive Popups**: Species information with images
- **Real-time API Integration**: Live data from Guardians of Earth API
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **React 18.3** - UI framework
- **Vite 5.4** - Build tool (fast HMR)
- **Mapbox GL JS 3.7** - Mapping library
- **Axios 1.7** - HTTP client

## Getting Started

### Prerequisites

- Node.js 20.x LTS
- Mapbox API token (get one at https://account.mapbox.com/access-tokens/)

### Installation

1. Install dependencies
```bash
npm install
```

2. Configure environment variables
```bash
# Create .env.local file and add your Mapbox token
```

3. Add your Mapbox token to `.env.local`
```env
VITE_MAPBOX_TOKEN=pk.your_actual_token_here
VITE_API_BASE_URL=https://portal.biosmart.life/api/v1
VITE_REALM_ID=12436
```

### Development

Start the development server:
```bash
npm run dev
```

The app will open at http://localhost:3000

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Usage

### Map Controls

**Top-Left:**
- 🏙️ **Style Switcher** - Click to change map styles

**Top-Right:**
- ➕➖ **Zoom Controls** - Zoom in/out
- 🧭 **Compass** - Reset map rotation
- ⛶ **Fullscreen** - Toggle fullscreen mode

**3D Buildings:**
- Hold **Ctrl/Cmd** + drag up/down to tilt the map
- Hold **Ctrl/Cmd** + drag left/right to rotate
- 3D buildings appear at zoom level 14+ on all map styles

### Map Features

- **Blue Clusters**: Click to zoom in and expand
- **Red Markers**: Click to view observation details
- **Popups**: Show species name, category, image, and spotter info

## Map Styles

| Style | 3D Buildings | Best For |
|-------|-------------|----------|
| 🏙️ Streets 3D | ✅ | Urban areas, showcasing architecture |
| 🛰️ Satellite 3D | ✅ | Aerial imagery with building heights |
| 🏔️ Outdoors 3D | ✅ | Hiking, topographic with 3D terrain |
| 🌙 Dark 3D | ✅ | Dark theme, urban night view |
| ☀️ Light 3D | ✅ | Clean, minimal with 3D depth |

## API Integration

The app fetches real-time biodiversity observations from the Guardians of Earth API:

**Endpoint:**
```
GET https://portal.biosmart.life/api/v1/contest/109/regions/{realmId}/observations
```

**Parameters:**
- `limit`: Number of observations (default: 20)
- `with_images`: Include images (default: true)

## Troubleshooting

### Map not loading
- Check that your Mapbox token is valid in `.env.local`
- Ensure token starts with `pk.`

### API errors
- Check network connection
- Verify realm ID is correct (default: 12436)

### 3D buildings not showing
- Zoom to level 14+
- All map styles support 3D buildings
- Hold Ctrl/Cmd and drag up to tilt the map to see 3D effect

### Clusters not working
- Check browser console for errors
- Ensure observations are loading (check Network tab)

## Credits

- **Mapbox GL JS** - Mapping library
- **Guardians of Earth** - Biodiversity data API
- **React** - UI framework
- **Vite** - Build tool

---

Built for biodiversity conservation 🌍
