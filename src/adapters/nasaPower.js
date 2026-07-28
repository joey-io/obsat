// NASA POWER serves 40-year climate normals rather than a forecast: the
// month-by-month solar, temperature, and rainfall baseline a place sits in.
// This is what a forecast should be compared against.
export const nasaPower = {
  id: "nasa-power",
  name: "NASA POWER Climatology",
  kind: "climate",
  provider: "NASA Langley Research Center",
  collections: ["climatology"],
  attribution: "NASA POWER Project",

  async observe({ lat, lon }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const url = new URL("https://power.larc.nasa.gov/api/temporal/climatology/point");
    url.searchParams.set("parameters", [
      "ALLSKY_SFC_SW_DWN",  // solar irradiance at the surface
      "T2M",                // mean air temperature at 2 m
      "T2M_MAX",
      "T2M_MIN",
      "PRECTOTCORR",        // corrected total precipitation
      "RH2M",               // relative humidity at 2 m
      "WS10M"               // wind speed at 10 m
    ].join(","));
    // The "RE" (renewable energy) community returns the solar and wind
    // parameters in the units this adapter documents below.
    url.searchParams.set("community", "RE");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("format", "JSON");

    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`nasa-power request failed: ${response.status}`);
    const data = await response.json();

    const parameters = data?.properties?.parameter ?? {};
    if (!Object.keys(parameters).length) return [];

    // POWER echoes the grid-cell centre plus its elevation as a third
    // coordinate; keep it as a plain lon/lat point.
    const coordinates = data?.geometry?.coordinates ?? [];

    return [{
      id: `nasa-power:${lat},${lon}`,
      adapter: "nasa-power",
      kind: "climatology",
      observedAt: null,
      geometry: {
        type: "Point",
        coordinates: [coordinates[0] ?? lon, coordinates[1] ?? lat]
      },
      properties: {
        // Each parameter is keyed JAN..DEC plus ANN for the annual figure.
        solarIrradiance: parameters.ALLSKY_SFC_SW_DWN ?? null,
        temperature: parameters.T2M ?? null,
        temperatureMax: parameters.T2M_MAX ?? null,
        temperatureMin: parameters.T2M_MIN ?? null,
        precipitation: parameters.PRECTOTCORR ?? null,
        relativeHumidity: parameters.RH2M ?? null,
        windSpeed: parameters.WS10M ?? null,
        elevationMeters: coordinates[2] ?? null,
        units: {
          solarIrradiance: "kWh/m²/day",
          temperature: "°C",
          precipitation: "mm/day",
          relativeHumidity: "%",
          windSpeed: "m/s"
        }
      },
      source: url.toString(),
      raw: data
    }];
  }
};
