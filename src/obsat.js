import { AdapterRegistry } from "./registry.js";
import { normalizeObservation } from "./evidence.js";

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
  capabilities() {
    return this.sources().map((source) => ({
      id: source.id,
      kind: source.kind,
      collections: source.collections,
      status: source.status,
      configured: source.env.every((name) => Boolean((this.env ?? process.env)[name]))
    }));
  }

  doctor() {
    const sources = this.sources();
    return {
      node: process.version,
      fetch: typeof (this.fetch ?? globalThis.fetch) === "function",
      sources: sources.length,
      missingEnvironment: sources.flatMap((source) =>
        source.env.filter((name) => !(this.env ?? process.env)[name]).map((name) => ({ source: source.id, name }))
      )
    };
  }

  async probe(options = {}) { return this.observe(options); }

  async observe({ lat, lon, sources, satellites, since, until, limit, radiusKm } = {}) {
    validatePoint(lat, lon);
    const selected = sources ?? satellites;
    const request = { lat, lon, since, until, limit, radiusKm };
    const { adapters, skipped } = this.#partition(this.registry.resolve(selected));

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
      if (result.status === "fulfilled") {
        for (const observation of result.value.observations ?? []) {
          observations.push(normalizeObservation(observation, adapter, request));
        }
      } else {
        errors.push({
          source: adapter.id,
          message: result.reason instanceof Error ? result.reason.message : String(result.reason)
        });
      }
    }

    return {
      location: { lat, lon },
      queriedAt: new Date().toISOString(),
      // Only the adapters that actually ran. Adapters held back for a missing
      // credential are reported separately in `skipped`.
      sources: adapters.map((adapter) => adapter.id),
      skipped,
      observations,
      errors
    };
  }

  // An adapter that declares `env` but has no value for it cannot produce data,
  // so running it only ever yields a predictable "requires KEY" failure. That
  // noise used to land in `errors` on every probe and made a clean run look
  // broken. Hold those adapters back instead and report them as skipped.
  #partition(resolved) {
    const environment = this.env ?? process.env;
    const adapters = [];
    const skipped = [];

    for (const adapter of resolved) {
      const missingEnv = (adapter.env ?? []).filter((name) => !environment[name]);
      if (missingEnv.length) {
        skipped.push({
          source: adapter.id,
          missingEnv,
          reason: `${adapter.id} needs ${missingEnv.join(", ")}`
        });
        continue;
      }
      adapters.push(adapter);
    }

    return { adapters, skipped };
  }
}

function validatePoint(lat, lon) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new RangeError("lat must be between -90 and 90");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new RangeError("lon must be between -180 and 180");
}
