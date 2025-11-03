export const config = {
  mapbox: {
    token: import.meta.env.VITE_MAPBOX_TOKEN,
    style: 'mapbox://styles/mapbox/streets-v12',
  },
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    defaultRealmId: import.meta.env.VITE_REALM_ID,
  },
};

// Validate config on load
if (!config.mapbox.token) {
  console.error('❌ VITE_MAPBOX_TOKEN is not set in .env.local');
}
