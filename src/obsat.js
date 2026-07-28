import { AdapterRegistry } from "./registry.js";

export class Obsat {
  constructor({ adapters = [], fetch, env } = {}) {
    this.registry = new AdapterRegistry();
    this.fetch = fetch;
    this.env = env;
    for (const adapter of adapters) this.registry.register(adapter);
  }

  use(adapter) {
    this.registry.register(adapter);
    return this;
  }

  sources() { return this.registry.list(); }
  satellites() { return this.sources().filter((source) => source.kind === "satellite"); }

  async probe(options = {}) { return this.observe(options); }

  async observe({ lat, lon, sources, satellites, since, until, limit, radiusKm } = {}) {
    validatePoint(lat, lon);
    const selected = sources ?? satellites;
    const request = { lat, lon, since, until, limit, radiusKm };
    const adapters = this.registry.resolve(selected);

    const settled = await Promise.allSettled(
      adapters.map(async (adapter) => ({
        adapter,
        observations: await adapter.observe(request, {
          fetch: this.fetch,
          env: this.env
        })
      }))
    );

    const observations = [];
    const errors = [];

    for (let index = 0; index < settled.length; index += 1) {
      const result = settled[index];
      const adapter = adapters[index];
      if (result.status === "fulfilled") observations.push(...result.value.observations);
      else errors.push({
        source: adapter.id,
        message: result.reason instanceof Error ? result.reason.message : String(result.reason)
      });
    }

    return {
      location: { lat, lon },
      queriedAt: new Date().toISOString(),
      sources: adapters.map((adapter) => adapter.id),
      observations,
      errors
    };
  }
}

function validatePoint(lat, lon) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new RangeError("lat must be between -90 and 90");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new RangeError("lon must be between -180 and 180");
}
