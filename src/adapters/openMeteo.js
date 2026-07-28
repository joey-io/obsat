export const openMeteo = {
  id: "open-meteo",
  name: "Open-Meteo Global Weather",
  kind: "weather",
  provider: "Open-Meteo",
  collections: ["current-weather", "hourly-weather", "soil-conditions"],

  async observe({ lat, lon }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "2");
    url.searchParams.set("current", [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "rain",
      "showers",
      "snowfall",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "surface_pressure",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m"
    ].join(","));
    url.searchParams.set("hourly", [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "visibility",
      "wind_speed_10m",
      "soil_temperature_0cm",
      "soil_moisture_0_to_1cm"
    ].join(","));

    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`open-meteo request failed: ${response.status}`);
    const data = await response.json();

    return [{
      id: `open-meteo:${lat},${lon}:${data.current?.time ?? "current"}`,
      adapter: "open-meteo",
      kind: "weather",
      observedAt: data.current?.time ?? null,
      geometry: { type: "Point", coordinates: [data.longitude ?? lon, data.latitude ?? lat] },
      properties: {
        elevation: data.elevation ?? null,
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