export function normalizeObservation(value, adapter, request) {
  if (!value || typeof value !== "object") {
    throw new TypeError(`${adapter.id} returned a non-object observation`);
  }

  const provider = adapter.provider ?? adapter.name;
  const sourceUrl = value.source ?? value.evidence?.url ?? null;

  return {
    id: String(value.id ?? `${adapter.id}:${crypto.randomUUID()}`),
    source: adapter.id,
    provider,
    kind: value.kind ?? adapter.kind ?? "observation",
    observedAt: value.observedAt ?? null,
    geometry: value.geometry ?? { type: "Point", coordinates: [request.lon, request.lat] },
    bbox: value.bbox ?? null,
    properties: value.properties ?? {},
    assets: value.assets ?? {},
    evidence: {
      url: sourceUrl,
      retrievedAt: new Date().toISOString(),
      collection: value.collection ?? value.properties?.collection ?? null
    },
    attribution: value.attribution ?? adapter.attribution ?? provider,
    license: value.license ?? adapter.license ?? null,
    raw: value.raw ?? value
  };
}
