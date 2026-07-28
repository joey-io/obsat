import test from "node:test";
import assert from "node:assert/strict";
import { Obsat, AdapterRegistry, createStacAdapter } from "../src/index.js";

test("registry registers and resolves adapters", () => {
  const registry = new AdapterRegistry();
  const adapter = {
    id: "demo",
    name: "Demo",
    satellite: "DemoSat",
    collections: [],
    async observe() { return []; }
  };

  registry.register(adapter);
  assert.equal(registry.get("demo"), adapter);
  assert.deepEqual(registry.resolve(["demo"]), [adapter]);
});

test("obsat combines observations from registered adapters", async () => {
  const adapter = {
    id: "demo",
    name: "Demo",
    satellite: "DemoSat",
    collections: ["demo"],
    async observe({ lat, lon }) {
      return [{ id: "scene-1", adapter: "demo", geometry: { lat, lon } }];
    }
  };

  const runtime = new Obsat({ adapters: [adapter] });
  const result = await runtime.observe({ lat: 38.8977, lon: -77.0365 });

  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].id, "scene-1");
  assert.deepEqual(result.errors, []);
});

test("STAC adapter sends point coordinates in lon, lat order", async () => {
  let requestBody;
  const adapter = createStacAdapter({
    id: "demo-stac",
    name: "Demo STAC",
    satellite: "DemoSat",
    endpoint: "https://example.test/search",
    collections: ["demo"]
  });

  const fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      async json() {
        return { features: [{ id: "x", properties: {}, assets: {}, links: [] }] };
      }
    };
  };

  const observations = await adapter.observe(
    { lat: 38.8977, lon: -77.0365, limit: 1 },
    { fetch }
  );

  assert.deepEqual(requestBody.intersects.coordinates, [-77.0365, 38.8977]);
  assert.equal(observations[0].adapter, "demo-stac");
});
