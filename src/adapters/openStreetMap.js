export const openStreetMap = {
  id: "openstreetmap",
  name: "OpenStreetMap Nearby Features",
  kind: "map-context",
  provider: "OpenStreetMap contributors",
  collections: ["nearby-features"],

  async observe({ lat, lon, radiusKm = 2, limit = 100 }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const radiusMeters = Math.max(25, Math.min(50000, Math.round(radiusKm * 1000)));
    const query = `[out:json][timeout:25];(
      nwr(around:${radiusMeters},${lat},${lon})[name];
      nwr(around:${radiusMeters},${lat},${lon})[amenity];
      nwr(around:${radiusMeters},${lat},${lon})[natural];
      nwr(around:${radiusMeters},${lat},${lon})[landuse];
      nwr(around:${radiusMeters},${lat},${lon})[waterway];
      nwr(around:${radiusMeters},${lat},${lon})[highway];
      nwr(around:${radiusMeters},${lat},${lon})[building];
    );out center tags ${Math.max(1, Math.min(500, limit))};`;

    const response = await fetchImpl("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "user-agent": "obsat/0.3 local location probe"
      },
      body: new URLSearchParams({ data: query })
    });

    if (!response.ok) throw new Error(`openstreetmap request failed: ${response.status}`);
    const data = await response.json();

    return (data.elements ?? []).slice(0, limit).map((element) => {
      const featureLat = element.lat ?? element.center?.lat ?? null;
      const featureLon = element.lon ?? element.center?.lon ?? null;
      return {
        id: `openstreetmap:${element.type}:${element.id}`,
        adapter: "openstreetmap",
        kind: "map-feature",
        observedAt: element.timestamp ?? null,
        geometry: Number.isFinite(featureLat) && Number.isFinite(featureLon)
          ? { type: "Point", coordinates: [featureLon, featureLat] }
          : null,
        properties: {
          osmType: element.type,
          osmId: element.id,
          tags: element.tags ?? {}
        },
        source: `https://www.openstreetmap.org/${element.type}/${element.id}`,
        raw: element
      };
    });
  }
};