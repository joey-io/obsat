export const airNow = {
  id: "airnow",
  name: "EPA AirNow",
  kind: "ground-sensor",
  provider: "EPA",
  collections: ["air-quality"],
  env: ["OBSAT_AIRNOW_API_KEY"],

  async observe({ lat, lon, radiusKm = 40 }, context = {}) {
    const key = (context.env ?? process.env).OBSAT_AIRNOW_API_KEY;
    if (!key) throw new Error("airnow requires OBSAT_AIRNOW_API_KEY");
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const url = new URL("https://www.airnowapi.org/aq/observation/latLong/current/");
    url.searchParams.set("format", "application/json");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("distance", String(Math.max(1, Math.round(radiusKm))));
    url.searchParams.set("API_KEY", key);

    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`airnow request failed: ${response.status}`);
    const data = await response.json();
    return data.map((item, index) => ({
      id: `airnow:${item.ReportingArea}:${item.ParameterName}:${index}`,
      adapter: "airnow",
      kind: "air-quality",
      observedAt: `${item.DateObserved}T${String(item.HourObserved).padStart(2, "0")}:00:00`,
      geometry: { type: "Point", coordinates: [item.Longitude, item.Latitude] },
      properties: item,
      source: "https://www.airnow.gov/",
      raw: item
    }));
  }
};
