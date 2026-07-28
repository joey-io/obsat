// Resolves a point to the US Census geographies it falls inside: state,
// county, tract, and block. Those GEOIDs are the join key for essentially
// every US demographic, economic, and public-health dataset.
export const census = {
  id: "census-geographies",
  name: "US Census Geographies",
  kind: "boundary",
  provider: "US Census Bureau",
  collections: ["geographies"],
  attribution: "US Census Bureau",

  async observe({ lat, lon }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const url = new URL("https://geocoding.geo.census.gov/geocoder/geographies/coordinates");
    url.searchParams.set("x", String(lon));
    url.searchParams.set("y", String(lat));
    url.searchParams.set("benchmark", "Public_AR_Current");
    url.searchParams.set("vintage", "Current_Current");
    url.searchParams.set("format", "json");
    url.searchParams.set("layers", "all");

    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`census-geographies request failed: ${response.status}`);
    const data = await response.json();

    const geographies = data?.result?.geographies ?? {};

    // Layer names are long and versioned ("2020 Census Blocks"), and they
    // change between vintages, so match on a stable substring instead of an
    // exact key. Points outside the US return every layer empty.
    return Object.entries(geographies).flatMap(([layer, entries]) =>
      (entries ?? []).map((entry) => ({
        id: `census:${slug(layer)}:${entry.GEOID ?? entry.OID ?? entry.BASENAME}`,
        adapter: "census-geographies",
        kind: "census-geography",
        observedAt: null,
        geometry: toPoint(entry, lat, lon),
        properties: {
          layer,
          name: entry.NAME ?? null,
          basename: entry.BASENAME ?? null,
          geoid: entry.GEOID ?? null,
          state: entry.STATE ?? null,
          county: entry.COUNTY ?? null,
          tract: entry.TRACT ?? null,
          block: entry.BLOCK ?? null,
          landAreaSqMeters: toNumber(entry.AREALAND),
          waterAreaSqMeters: toNumber(entry.AREAWATER)
        },
        source: url.toString(),
        raw: entry
      }))
    );
  }
};

function toPoint(entry, lat, lon) {
  // Census returns signed, zero-padded strings like "+38.9837744".
  const centroidLat = toNumber(entry.CENTLAT);
  const centroidLon = toNumber(entry.CENTLON);
  if (centroidLat === null || centroidLon === null) {
    return { type: "Point", coordinates: [lon, lat] };
  }
  return { type: "Point", coordinates: [centroidLon, centroidLat] };
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
