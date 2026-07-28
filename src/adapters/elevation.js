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

    // EPQS returns the elevation as a JSON *string* ("103.721260071"), and it
    // has no `valueDate` or `dataSource` field. The acquisition date lives at
    // attributes.AcquisitionDate and the source raster is described by
    // `resolution` and `rasterId`. Reading the old field names produced an
    // observation with a string elevation and two permanent nulls.
    const acquiredAt = parseAcquisitionDate(data?.attributes?.AcquisitionDate);

    return [{
      id: `usgs-elevation:${lat},${lon}`,
      adapter: "usgs-elevation",
      kind: "elevation",
      observedAt: acquiredAt,
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        elevationMeters: toNumber(data?.value),
        acquiredAt,
        resolutionMeters: toNumber(data?.resolution),
        rasterId: data?.rasterId ?? null,
        units: "meters"
      },
      source: url.toString(),
      raw: data
    }];
  }
};

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// EPQS reports the source-raster acquisition date as US-style M/D/YYYY.
// Normalize it to a plain ISO calendar date. The API gives no time of day, so
// none is invented here.
function parseAcquisitionDate(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
