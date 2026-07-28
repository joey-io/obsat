export function createStacAdapter({ id, name, satellite, endpoint, collections, env = [] }) {
  return {
    id,
    name,
    satellite,
    endpoint,
    collections,
    env,

    async observe(request, context = {}) {
      const fetchImpl = context.fetch ?? globalThis.fetch;
      if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required");

      const body = {
        collections,
        intersects: pointGeometry(request.lat, request.lon),
        limit: request.limit ?? 10
      };

      if (request.since || request.until) {
        body.datetime = `${request.since ?? ".."}/${request.until ?? ".."}`;
      }

      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders(env, context.env ?? process.env)
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`${id} request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return (data.features ?? []).map((feature) => normalizeFeature(feature, id, satellite));
    }
  };
}

function pointGeometry(lat, lon) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new RangeError("lat must be between -90 and 90");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new RangeError("lon must be between -180 and 180");
  return { type: "Point", coordinates: [lon, lat] };
}

function authHeaders(envNames, values) {
  const headers = {};
  for (const name of envNames) {
    if (values[name]) headers.authorization = `Bearer ${values[name]}`;
  }
  return headers;
}

function normalizeFeature(feature, adapter, satellite) {
  return {
    id: feature.id,
    adapter,
    satellite,
    observedAt: feature.properties?.datetime ?? feature.properties?.start_datetime ?? null,
    geometry: feature.geometry ?? null,
    bbox: feature.bbox ?? null,
    assets: feature.assets ?? {},
    properties: feature.properties ?? {},
    source: feature.links?.find((link) => link.rel === "self")?.href ?? null,
    raw: feature
  };
}
