export const openMeteoAir = {
  id: "open-meteo-air",
  name: "Open-Meteo Global Air Quality",
  kind: "air-quality",
  provider: "Open-Meteo/CAMS",
  collections: ["current-air-quality", "hourly-air-quality"],

  async observe({ lat, lon }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "2");
    url.searchParams.set("current", [
      "pm10",
      "pm2_5",
      "carbon_monoxide",
      "nitrogen_dioxide",
      "sulphur_dioxide",
      "ozone",
      "aerosol_optical_depth",
      "dust",
      "uv_index",
      "us_aqi",
      "european_aqi"
    ].join(","));
    url.searchParams.set("hourly", [
      "pm10",
      "pm2_5",
      "nitrogen_dioxide",
      "ozone",
      "dust",
      "us_aqi",
      "european_aqi"
    ].join(","));

    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`open-meteo-air request failed: ${response.status}`);
    const data = await response.json();

    return [{
      id: `open-meteo-air:${lat},${lon}:${data.current?.time ?? "current"}`,
      adapter: "open-meteo-air",
      kind: "air-quality",
      observedAt: data.current?.time ?? null,
      geometry: { type: "Point", coordinates: [data.longitude ?? lon, data.latitude ?? lat] },
      properties: {
        timezone: data.timezone ?? null,
        current: data.current ?? {},
        currentUnits: data.current_units ?? {},
        hourly: data.hourly ?? {},
        hourlyUnits: data.hourly_units ?? {}
      },
      source: url.toString(),
      raw: data
    }];
  }
};