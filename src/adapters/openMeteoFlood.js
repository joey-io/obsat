// River discharge from GloFAS. Answers whether the nearest modelled river
// reach is rising or falling, which no point-weather source covers.
export const openMeteoFlood = {
  id: "open-meteo-flood",
  name: "Open-Meteo River Discharge",
  kind: "hydrology",
  provider: "Open-Meteo/GloFAS",
  collections: ["river-discharge"],
  attribution: "Open-Meteo, Copernicus Emergency Management Service GloFAS",

  async observe({ lat, lon }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const url = new URL("https://flood-api.open-meteo.com/v1/flood");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("daily", "river_discharge");
    url.searchParams.set("forecast_days", "7");

    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`open-meteo-flood request failed: ${response.status}`);
    const data = await response.json();

    const days = data?.daily?.time ?? [];
    const discharge = data?.daily?.river_discharge ?? [];
    if (!days.length) return [];

    return [{
      id: `open-meteo-flood:${lat},${lon}:${days[0]}`,
      adapter: "open-meteo-flood",
      kind: "river-discharge",
      observedAt: days[0],
      // GloFAS snaps to the centre of its own river grid cell, so the reported
      // coordinates can sit a few kilometres from the requested point.
      geometry: {
        type: "Point",
        coordinates: [data.longitude ?? lon, data.latitude ?? lat]
      },
      properties: {
        units: data?.daily_units?.river_discharge ?? "m³/s",
        currentDischarge: discharge[0] ?? null,
        daily: days.map((day, index) => ({ date: day, discharge: discharge[index] ?? null })),
        modelCellLat: data.latitude ?? null,
        modelCellLon: data.longitude ?? null
      },
      source: url.toString(),
      raw: data
    }];
  }
};
