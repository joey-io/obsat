export const elevation = {
  id: "usgs-elevation",
  name: "USGS Elevation",
  kind: "terrain",
  provider: "USGS",
  collections: ["3dep-elevation"],

  async observe({ lat, lon }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const url = new URL("https://epqs.nationalmap.gov/v1/json");
    url.searchParams.set("x", String(lon));
    url.searchParams.set("y", String(lat));
    url.searchParams.set("wkid", "4326");
    url.searchParams.set("units", "Meters");
    url.searchParams.set("includeDate", "true");

    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`usgs-elevation request failed: ${response.status}`);
    const data = await response.json();
    return [{
      id: `usgs-elevation:${lat},${lon}`,
      adapter: "usgs-elevation",
      kind: "elevation",
      observedAt: data?.valueDate ?? null,
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        elevationMeters: data?.value ?? null,
        dataSource: data?.dataSource ?? null,
        units: "meters"
      },
      source: url.toString(),
      raw: data
    }];
  }
};
