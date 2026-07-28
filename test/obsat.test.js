import test from "node:test";
import assert from "node:assert/strict";
import {
  Obsat,
  AdapterRegistry,
  createStacAdapter,
  openMeteo,
  openMeteoAir,
  openStreetMap
} from "../src/index.js";

test("registry registers and resolves adapters", () => {
  const registry = new AdapterRegistry();
  const adapter = {
    id: "demo",
    name: "Demo",
    kind: "sensor",
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
    kind: "sensor",
    collections: ["demo"],
    async observe({ lat, lon }) {
      return [{ id: "reading-1", adapter: "demo", geometry: { type: "Point", coordinates: [lon, lat] } }];
    }
  };

  const runtime = new Obsat({ adapters: [adapter] });
  const result = await runtime.probe({ lat: 38.8977, lon: -77.0365 });

  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].id, "reading-1");
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.sources, ["demo"]);
});

test("one failed adapter does not stop other adapters", async () => {
  const good = { id: "good", name: "Good", async observe() { return [{ id: "ok" }]; } };
  const bad = { id: "bad", name: "Bad", async observe() { throw new Error("offline"); } };
  const runtime = new Obsat({ adapters: [good, bad] });
  const result = await runtime.probe({ lat: 1, lon: 2 });

  assert.equal(result.observations[0].id, "ok");
  assert.deepEqual(result.errors, [{ source: "bad", message: "offline" }]);
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
    return response({ features: [{ id: "x", properties: {}, assets: {}, links: [] }] });
  };

  const observations = await adapter.observe(
    { lat: 38.8977, lon: -77.0365, limit: 1 },
    { fetch }
  );

  assert.deepEqual(requestBody.intersects.coordinates, [-77.0365, 38.8977]);
  assert.equal(observations[0].adapter, "demo-stac");
});

test("Open-Meteo sends coordinates and normalizes current weather", async () => {
  let requested;
  const fetch = async (url) => {
    requested = new URL(url);
    return response({
      latitude: 38.9,
      longitude: -77.04,
      timezone: "America/New_York",
      current: { time: "2026-07-28T00:00", temperature_2m: 25 },
      current_units: { temperature_2m: "°C" },
      hourly: { time: [] },
      hourly_units: {}
    });
  };

  const [observation] = await openMeteo.observe({ lat: 38.9, lon: -77.04 }, { fetch });
  assert.equal(requested.searchParams.get("latitude"), "38.9");
  assert.equal(requested.searchParams.get("longitude"), "-77.04");
  assert.equal(observation.properties.current.temperature_2m, 25);
});

test("Open-Meteo air quality normalizes AQI", async () => {
  const fetch = async () => response({
    latitude: 38.9,
    longitude: -77.04,
    current: { time: "2026-07-28T00:00", us_aqi: 42, pm2_5: 8 },
    current_units: { us_aqi: "USAQI", pm2_5: "μg/m³" },
    hourly: {},
    hourly_units: {}
  });

  const [observation] = await openMeteoAir.observe({ lat: 38.9, lon: -77.04 }, { fetch });
  assert.equal(observation.properties.current.us_aqi, 42);
  assert.equal(observation.kind, "air-quality");
});

test("OpenStreetMap converts nearby elements into observations", async () => {
  let body;
  const fetch = async (_url, options) => {
    body = String(options.body);
    return response({ elements: [{ type: "node", id: 1, lat: 38.9, lon: -77.04, tags: { name: "Demo" } }] });
  };

  const [observation] = await openStreetMap.observe({ lat: 38.9, lon: -77.04, radiusKm: 1 }, { fetch });
  assert.match(body, /around%3A1000%2C38.9%2C-77.04/);
  assert.equal(observation.id, "openstreetmap:node:1");
  assert.equal(observation.properties.tags.name, "Demo");
});

function response(data, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    async json() { return data; },
    async text() { return typeof data === "string" ? data : JSON.stringify(data); }
  };
}
