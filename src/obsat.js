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

  satellites() {
    return this.registry.list();
  }

  async observe({ lat, lon, satellites, since, until, limit } = {}) {
    const request = { lat, lon, since, until, limit };
    const adapters = this.registry.resolve(satellites);

    const settled = await Promise.allSettled(
      adapters.map(async (adapter) => ({
        adapter: adapter.id,
        observations: await adapter.observe(request, {
          fetch: this.fetch,
          env: this.env
        })
      }))
    );

    const observations = [];
    const errors = [];

    for (const result of settled) {
      if (result.status === "fulfilled") observations.push(...result.value.observations);
      else errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }

    return {
      location: { lat, lon },
      observations,
      errors
    };
  }
}
