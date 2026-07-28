export const earthquakes = {
  id: "usgs-earthquakes",
  name: "USGS Earthquakes",
  kind: "ground-sensor",
  provider: "USGS",
  collections: ["earthquakes"],

  async observe({ lat, lon, since, until, limit = 20, radiusKm = 100 }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const url = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
    url.searchParams.set("format", "geojson");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("maxradiuskm", String(radiusKm));
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("orderby", "time");
    if (since) url.searchParams.set("starttime", since);
    if (until) url.searchParams.set("endtime", until);

    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`usgs-earthquakes request failed: ${response.status}`);
    const data = await response.json();
    return (data.features ?? []).map((feature) => ({
      id: feature.id,
      adapter: "usgs-earthquakes",
      kind: "earthquake",
      observedAt: feature.properties?.time ? new Date(feature.properties.time).toISOString() : null,
      geometry: feature.geometry ?? null,
      properties: feature.properties ?? {},
      source: feature.properties?.url ?? null,
      raw: feature
    }));
  }
};
