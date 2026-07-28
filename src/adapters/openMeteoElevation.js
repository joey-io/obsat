// The USGS 3DEP adapter is far more precise but stops at the US border. This
// is the global fallback, derived from the Copernicus DEM at 90 m.
export const openMeteoElevation = {
  id: "open-meteo-elevation",
  name: "Open-Meteo Global Elevation",
  kind: "terrain",
  provider: "Open-Meteo/Copernicus DEM",
  collections: ["global-elevation"],
  attribution: "Open-Meteo, Copernicus DEM GLO-90",

  async observe({ lat, lon }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const url = new URL("https://api.open-meteo.com/v1/elevation");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));

    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`open-meteo-elevation request failed: ${response.status}`);
    const data = await response.json();

    // The endpoint is batch-capable, so a single point still comes back as a
    // one-element array.
    const value = Array.isArray(data?.elevation) ? data.elevation[0] : null;
    if (!Number.isFinite(value)) return [];

    return [{
      id: `open-meteo-elevation:${lat},${lon}`,
      adapter: "open-meteo-elevation",
      kind: "elevation",
      observedAt: null,
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        elevationMeters: value,
        units: "meters",
        model: "Copernicus DEM GLO-90",
        resolutionMeters: 90
      },
      source: url.toString(),
      raw: data
    }];
  }
};
