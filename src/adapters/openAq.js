// OpenAQ federates government reference monitors and low-cost sensors
// worldwide. Where AirNow stops at the US border, this keeps going.
//
// The v3 API requires a free API key; v2 was retired. Without the key this
// adapter is skipped rather than run.
export const openAq = {
  id: "openaq",
  name: "OpenAQ Air Quality Stations",
  kind: "ground-sensor",
  provider: "OpenAQ",
  collections: ["air-quality-stations"],
  env: ["OBSAT_OPENAQ_API_KEY"],
  attribution: "OpenAQ",

  async observe({ lat, lon, radiusKm = 25, limit = 20 }, context = {}) {
    const key = (context.env ?? process.env).OBSAT_OPENAQ_API_KEY;
    if (!key) throw new Error("openaq requires OBSAT_OPENAQ_API_KEY");
    const fetchImpl = context.fetch ?? globalThis.fetch;

    const url = new URL("https://api.openaq.org/v3/locations");
    // coordinates is latitude,longitude and radius is in metres, capped at 25 km.
    url.searchParams.set("coordinates", `${lat},${lon}`);
    url.searchParams.set("radius", String(Math.max(1, Math.min(25000, Math.round(radiusKm * 1000)))));
    url.searchParams.set("limit", String(Math.max(1, Math.min(1000, limit))));

    const response = await fetchImpl(url, { headers: { "X-API-Key": key } });
    if (!response.ok) throw new Error(`openaq request failed: ${response.status}`);
    const data = await response.json();

    return (data.results ?? []).map((station) => ({
      id: `openaq:${station.id}`,
      adapter: "openaq",
      kind: "air-quality-station",
      observedAt: station.datetimeLast?.utc ?? null,
      geometry: station.coordinates
        ? { type: "Point", coordinates: [station.coordinates.longitude, station.coordinates.latitude] }
        : null,
      properties: {
        name: station.name ?? null,
        locality: station.locality ?? null,
        country: station.country?.name ?? null,
        countryCode: station.country?.code ?? null,
        provider: station.provider?.name ?? null,
        isMonitor: station.isMonitor ?? null,
        // Which pollutants this station actually reports.
        parameters: (station.sensors ?? []).map((sensor) => ({
          parameter: sensor.parameter?.name ?? null,
          displayName: sensor.parameter?.displayName ?? null,
          units: sensor.parameter?.units ?? null
        })),
        firstReading: station.datetimeFirst?.utc ?? null,
        lastReading: station.datetimeLast?.utc ?? null
      },
      source: `https://explore.openaq.org/locations/${station.id}`,
      raw: station
    }));
  }
};
