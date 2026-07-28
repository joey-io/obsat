// GBIF aggregates museum specimens, survey records, and citizen-science
// sightings into one occurrence index — what has actually been observed living
// at a point, as opposed to what a habitat model predicts.
export const gbif = {
  id: "gbif",
  name: "GBIF Species Occurrences",
  kind: "biodiversity",
  provider: "Global Biodiversity Information Facility",
  collections: ["occurrences"],
  attribution: "GBIF.org",

  async observe({ lat, lon, radiusKm = 5, limit = 20, since, until }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const url = new URL("https://api.gbif.org/v1/occurrence/search");
    // geoDistance is ordered latitude,longitude,distance — passing lon first
    // returns "Argument is not a valid number" rather than an empty result.
    url.searchParams.set("geoDistance", `${lat},${lon},${formatDistance(radiusKm)}`);
    url.searchParams.set("limit", String(Math.max(1, Math.min(300, limit))));
    url.searchParams.set("hasCoordinate", "true");
    if (since || until) {
      // GBIF expects an ISO date range joined with a comma.
      url.searchParams.set("eventDate", `${toDate(since) ?? "*"},${toDate(until) ?? "*"}`);
    }

    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`gbif request failed: ${response.status}`);
    const data = await response.json();

    return (data.results ?? []).map((record) => ({
      id: `gbif:${record.key}`,
      adapter: "gbif",
      kind: "occurrence",
      observedAt: record.eventDate ?? null,
      geometry: Number.isFinite(record.decimalLatitude) && Number.isFinite(record.decimalLongitude)
        ? { type: "Point", coordinates: [record.decimalLongitude, record.decimalLatitude] }
        : null,
      properties: {
        // `species` is absent on records identified only to genus or family.
        species: record.species ?? null,
        scientificName: record.scientificName ?? null,
        vernacularName: record.vernacularName ?? null,
        kingdom: record.kingdom ?? null,
        phylum: record.phylum ?? null,
        class: record.class ?? null,
        order: record.order ?? null,
        family: record.family ?? null,
        genus: record.genus ?? null,
        basisOfRecord: record.basisOfRecord ?? null,
        datasetName: record.datasetName ?? null,
        recordedBy: record.recordedBy ?? null,
        individualCount: record.individualCount ?? null,
        // Total matches for the area, not just the page returned here.
        totalMatches: data.count ?? null
      },
      source: `https://www.gbif.org/occurrence/${record.key}`,
      raw: record
    }));
  }
};

function formatDistance(radiusKm) {
  // GBIF accepts a distance with a unit suffix and rejects fractional metres.
  const metres = Math.max(1, Math.round(radiusKm * 1000));
  return `${metres}m`;
}

function toDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}
