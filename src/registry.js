export class AdapterRegistry {
  #adapters = new Map();

  register(adapter) {
    validateAdapter(adapter);
    if (this.#adapters.has(adapter.id)) {
      throw new Error(`Adapter already registered: ${adapter.id}`);
    }
    this.#adapters.set(adapter.id, adapter);
    return this;
  }

  get(id) {
    return this.#adapters.get(id);
  }

  has(id) {
    return this.#adapters.has(id);
  }

  list() {
    return [...this.#adapters.values()].map(({ id, name, satellite, collections }) => ({
      id,
      name,
      satellite,
      collections: [...collections]
    }));
  }

  resolve(ids) {
    const requested = ids?.length ? ids : [...this.#adapters.keys()];
    return requested.map((id) => {
      const adapter = this.get(id);
      if (!adapter) throw new Error(`Unknown adapter: ${id}`);
      return adapter;
    });
  }
}

function validateAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") throw new TypeError("Adapter must be an object");
  if (!adapter.id || typeof adapter.id !== "string") throw new TypeError("Adapter requires a string id");
  if (!adapter.name || typeof adapter.name !== "string") throw new TypeError("Adapter requires a string name");
  if (!adapter.satellite || typeof adapter.satellite !== "string") throw new TypeError("Adapter requires a satellite name");
  if (!Array.isArray(adapter.collections)) throw new TypeError("Adapter collections must be an array");
  if (typeof adapter.observe !== "function") throw new TypeError("Adapter requires observe(request)");
}
