import { USER_AGENT } from "../version.js";

export const weather = {
  id: "nws-weather",
  name: "US National Weather Service",
  kind: "weather",
  provider: "NOAA/NWS",
  collections: ["forecast", "forecast-hourly", "stations"],

  async observe({ lat, lon }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const headers = {
      "accept": "application/geo+json",
      "user-agent": USER_AGENT
    };

    // api.weather.gov only keeps 4 decimal places on /points and answers a 301
    // to the truncated URL for anything longer. Rounding up front skips that
    // redirect round trip instead of relying on the fetch implementation to
    // follow it.
    const pointUrl = `https://api.weather.gov/points/${round4(lat)},${round4(lon)}`;
    const pointResponse = await fetchImpl(pointUrl, { headers });
    // The NWS forecasts the United States and its territories. Anywhere else
    // it answers 404 with an InvalidPoint problem document, which is the
    // service saying "not mine" rather than failing. Report nothing.
    if (pointResponse.status === 404) return [];
    if (!pointResponse.ok) throw new Error(`nws-weather point request failed: ${pointResponse.status}`);
    const point = await pointResponse.json();
    const properties = point.properties ?? {};

    const observations = [{
      id: `nws-point:${lat},${lon}`,
      adapter: "nws-weather",
      kind: "weather-gridpoint",
      observedAt: new Date().toISOString(),
      geometry: point.geometry ?? { type: "Point", coordinates: [lon, lat] },
      properties: {
        gridId: properties.gridId ?? null,
        gridX: properties.gridX ?? null,
        gridY: properties.gridY ?? null,
        timeZone: properties.timeZone ?? null,
        forecastOffice: properties.forecastOffice ?? null,
        county: properties.county ?? null,
        fireWeatherZone: properties.fireWeatherZone ?? null
      },
      source: pointUrl,
      raw: point
    }];

    if (properties.forecastHourly) {
      const forecastResponse = await fetchImpl(properties.forecastHourly, { headers });
      if (forecastResponse.ok) {
        const forecast = await forecastResponse.json();
        observations.push(...(forecast.properties?.periods ?? []).slice(0, 24).map((period) => ({
          id: `nws-hourly:${period.number}:${period.startTime}`,
          adapter: "nws-weather",
          kind: "weather-forecast",
          observedAt: period.startTime ?? null,
          geometry: point.geometry ?? null,
          properties: period,
          source: properties.forecastHourly,
          raw: period
        })));
      }
    }

    return observations;
  }
};

function round4(value) {
  return Number(value.toFixed(4));
}
