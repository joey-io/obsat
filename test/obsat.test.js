import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  Obsat,
  AdapterRegistry,
  createStacAdapter,
  OBSAT_VERSION,
  openMeteo,
  openMeteoAir,
  openStreetMap,
  elevation,
  water,
  nominatim,
  wikipedia,
  gbif,
  census,
  epaEcho,
  openMeteoElevation,
  openMeteoFlood,
  nasaPower,
  hlsLandsat,
  hlsSentinel
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

test("STAC adapter requests newest-first only when asked", async () => {
  const bodies = [];
  const fetch = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return response({ features: [] });
  };

  const plain = createStacAdapter({
    id: "plain-stac", name: "Plain", endpoint: "https://example.test/search", collections: ["a"]
  });
  const sorted = createStacAdapter({
    id: "sorted-stac", name: "Sorted", endpoint: "https://example.test/search", collections: ["a"],
    sortByNewest: true
  });

  await plain.observe({ lat: 1, lon: 2 }, { fetch });
  await sorted.observe({ lat: 1, lon: 2 }, { fetch });

  assert.equal(bodies[0].sortby, undefined);
  // CMR returns catalogue order, which surfaced 2013 scenes for a probe today.
  assert.deepEqual(bodies[1].sortby, [{ field: "properties.datetime", direction: "desc" }]);
});

test("HLS adapters point at NASA CMR, which is the only host that has them", () => {
  for (const adapter of [hlsLandsat, hlsSentinel]) {
    assert.match(adapter.endpoint, /cmr\.earthdata\.nasa\.gov/);
    // earth-search has no hls-l30 / hls-s30, so the lowercase ids returned
    // an empty list forever rather than failing loudly.
    assert.match(adapter.collections[0], /^HLS[LS]30_2\.0$/);
  }
});

test("reported version matches package.json", () => {
  // src/version.js feeds the outbound User-Agent and the MCP handshake. If it
  // drifts from package.json we ship a stale identity, which is exactly what
  // happened when three files each hardcoded a different number.
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(OBSAT_VERSION, manifest.version);
});

test("adapters missing a required key are skipped, not run", async () => {
  let ran = false;
  const keyed = {
    id: "keyed",
    name: "Keyed",
    env: ["OBSAT_TEST_KEY"],
    async observe() { ran = true; return [{ id: "nope" }]; }
  };
  const open = { id: "open", name: "Open", async observe() { return [{ id: "yes" }]; } };

  const runtime = new Obsat({ adapters: [keyed, open], env: {} });
  const result = await runtime.probe({ lat: 1, lon: 2 });

  assert.equal(ran, false, "adapter without its key must not be called");
  assert.deepEqual(result.errors, [], "a missing key is not an error");
  assert.deepEqual(result.sources, ["open"]);
  assert.deepEqual(result.skipped, [{
    source: "keyed",
    missingEnv: ["OBSAT_TEST_KEY"],
    reason: "keyed needs OBSAT_TEST_KEY"
  }]);
  assert.equal(result.observations.length, 1);
});

test("adapters run once their key is present", async () => {
  const keyed = {
    id: "keyed",
    name: "Keyed",
    env: ["OBSAT_TEST_KEY"],
    async observe() { return [{ id: "reading" }]; }
  };

  const runtime = new Obsat({ adapters: [keyed], env: { OBSAT_TEST_KEY: "set" } });
  const result = await runtime.probe({ lat: 1, lon: 2 });

  assert.deepEqual(result.skipped, []);
  assert.deepEqual(result.sources, ["keyed"]);
  assert.equal(result.observations[0].id, "reading");
});

test("explicitly requesting a keyless-blocked adapter still skips it", async () => {
  const keyed = {
    id: "keyed",
    name: "Keyed",
    env: ["OBSAT_TEST_KEY"],
    async observe() { throw new Error("must not run"); }
  };

  const runtime = new Obsat({ adapters: [keyed], env: {} });
  const result = await runtime.probe({ lat: 1, lon: 2, sources: ["keyed"] });

  assert.deepEqual(result.sources, []);
  assert.deepEqual(result.errors, []);
  assert.equal(result.skipped[0].source, "keyed");
});

test("registry does not assume an adapter without a kind is a satellite", () => {
  const registry = new AdapterRegistry();
  registry.register({ id: "plain", name: "Plain", async observe() { return []; } });
  assert.equal(registry.list()[0].kind, "observation");
});

test("STAC adapters declare themselves as satellites", () => {
  const adapter = createStacAdapter({
    id: "demo-stac-kind",
    name: "Demo",
    satellite: "DemoSat",
    endpoint: "https://example.test/search",
    collections: ["demo"]
  });
  assert.equal(adapter.kind, "satellite");
});

test("usgs-water keeps bbox coordinates within the 7 decimal NWIS limit", async () => {
  let siteUrl;
  const fetch = async (url) => {
    siteUrl ??= new URL(url);
    return response("", { ok: true });
  };

  // 10 / 111 is 0.09009009009009009, which NWIS rejects with a 400.
  await water.observe({ lat: 38.9847, lon: -77.0947, radiusKm: 10 }, { fetch });

  const bbox = siteUrl.searchParams.get("bBox").split(",");
  assert.equal(bbox.length, 4);
  for (const edge of bbox) {
    const decimals = edge.split(".")[1] ?? "";
    assert.ok(decimals.length <= 7, `${edge} has ${decimals.length} decimal places`);
  }
});

test("usgs-elevation parses the string value and the M/D/YYYY acquisition date", async () => {
  const fetch = async () => response({
    value: "103.721260071",
    rasterId: 16998,
    resolution: 1,
    attributes: { AcquisitionDate: "11/3/2023" }
  });

  const [observation] = await elevation.observe({ lat: 38.9847, lon: -77.0947 }, { fetch });

  assert.equal(observation.properties.elevationMeters, 103.721260071);
  assert.equal(typeof observation.properties.elevationMeters, "number");
  assert.equal(observation.properties.resolutionMeters, 1);
  assert.equal(observation.properties.rasterId, 16998);
  assert.equal(observation.observedAt, "2023-11-03");
});

test("usgs-elevation tolerates a missing acquisition date", async () => {
  const fetch = async () => response({ value: "12.5" });
  const [observation] = await elevation.observe({ lat: 1, lon: 2 }, { fetch });
  assert.equal(observation.observedAt, null);
  assert.equal(observation.properties.elevationMeters, 12.5);
});

test("nominatim flattens the address into stable fields", async () => {
  const fetch = async () => response({
    osm_type: "way",
    osm_id: 1318436770,
    lat: "38.9846834",
    lon: "-77.0947047",
    display_name: "Bethesda Metro Center, Bethesda, Montgomery County, Maryland, United States",
    address: {
      town: "Bethesda",
      county: "Montgomery County",
      state: "Maryland",
      postcode: "20814",
      country_code: "us"
    }
  });

  const [observation] = await nominatim.observe({ lat: 38.9847, lon: -77.0947 }, { fetch });

  // "town" rather than "city" — the fallback chain has to cover both.
  assert.equal(observation.properties.locality, "Bethesda");
  assert.equal(observation.properties.county, "Montgomery County");
  assert.equal(observation.properties.countryCode, "US");
  assert.equal(observation.source, "https://www.openstreetmap.org/way/1318436770");
});

test("nominatim returns nothing for a point with no address", async () => {
  const fetch = async () => response({ error: "Unable to geocode" });
  const observations = await nominatim.observe({ lat: 0, lon: 0 }, { fetch });
  assert.deepEqual(observations, []);
});

test("wikipedia clamps the radius to the 10 km API limit", async () => {
  let requested;
  const fetch = async (url) => {
    requested = new URL(url);
    return response({ query: { geosearch: [{ pageid: 1, title: "Demo", lat: 1, lon: 2, dist: 5 }] } });
  };

  const [observation] = await wikipedia.observe({ lat: 1, lon: 2, radiusKm: 500 }, { fetch });

  assert.equal(requested.searchParams.get("gsradius"), "10000");
  assert.equal(observation.properties.title, "Demo");
  assert.equal(observation.source, "https://en.wikipedia.org/?curid=1");
});

test("gbif sends geoDistance as latitude, longitude, distance", async () => {
  let requested;
  const fetch = async (url) => {
    requested = new URL(url);
    return response({ count: 42, results: [{ key: 7, species: "Sciurus carolinensis", eventDate: "2026-01-02" }] });
  };

  const [observation] = await gbif.observe({ lat: 38.9847, lon: -77.0947, radiusKm: 5 }, { fetch });

  // Longitude first returns "Argument is not a valid number", so order matters.
  assert.equal(requested.searchParams.get("geoDistance"), "38.9847,-77.0947,5000m");
  assert.equal(observation.properties.species, "Sciurus carolinensis");
  assert.equal(observation.properties.totalMatches, 42);
});

test("census expands every geography layer the point falls inside", async () => {
  const fetch = async () => response({
    result: {
      geographies: {
        "Counties": [{ GEOID: "24031", NAME: "Montgomery County", CENTLAT: "+39.1367", CENTLON: "-077.2033" }],
        "States": [{ GEOID: "24", NAME: "Maryland", CENTLAT: "+38.9466", CENTLON: "-076.6744" }]
      }
    }
  });

  const observations = await census.observe({ lat: 38.9847, lon: -77.0947 }, { fetch });

  assert.equal(observations.length, 2);
  const county = observations.find((item) => item.properties.layer === "Counties");
  assert.equal(county.properties.name, "Montgomery County");
  // Signed, zero-padded strings must survive as real numbers.
  assert.deepEqual(county.geometry.coordinates, [-77.2033, 39.1367]);
});

test("epa-echo follows the two-step query and sorts the page by distance", async () => {
  const calls = [];
  const fetch = async (url) => {
    const parsed = new URL(url);
    calls.push(parsed);
    if (parsed.pathname.endsWith("get_facilities")) {
      return response({ Results: { QueryID: "437", QueryRows: "2" } });
    }
    return response({
      Results: {
        Facilities: [
          { RegistryID: "far", FacName: "AAA Far", FacLat: "39.2000", FacLong: "-77.0947" },
          { RegistryID: "near", FacName: "ZZZ Near", FacLat: "38.9850", FacLong: "-77.0947" }
        ]
      }
    });
  };

  const observations = await epaEcho.observe({ lat: 38.9847, lon: -77.0947, radiusKm: 5 }, { fetch });

  assert.equal(calls[0].searchParams.get("p_radius"), "3.11");
  assert.equal(calls[1].searchParams.get("qid"), "437");
  // FacLong is not in the default column set, so it must be requested.
  assert.match(calls[1].searchParams.get("qcolumns"), /(^|,)18(,|$)/);
  // Alphabetically "AAA Far" sorts first; by distance "ZZZ Near" must win.
  assert.equal(observations[0].properties.name, "ZZZ Near");
  assert.equal(observations[1].properties.name, "AAA Far");
});

test("epa-echo surfaces the API's own error message", async () => {
  const fetch = async () => response({ Results: { Error: { ErrorMessage: "p_radius required" } } });
  await assert.rejects(
    () => epaEcho.observe({ lat: 1, lon: 2 }, { fetch }),
    /p_radius required/
  );
});

test("open-meteo-elevation unwraps the batch array", async () => {
  const fetch = async () => response({ elevation: [110.0] });
  const [observation] = await openMeteoElevation.observe({ lat: 38.9847, lon: -77.0947 }, { fetch });
  assert.equal(observation.properties.elevationMeters, 110);
});

test("open-meteo-flood pairs each day with its discharge", async () => {
  const fetch = async () => response({
    latitude: 38.975006,
    longitude: -77.07499,
    daily_units: { river_discharge: "m³/s" },
    daily: { time: ["2026-07-28", "2026-07-29"], river_discharge: [2.83, 8.4] }
  });

  const [observation] = await openMeteoFlood.observe({ lat: 38.9847, lon: -77.0947 }, { fetch });

  assert.equal(observation.properties.currentDischarge, 2.83);
  assert.deepEqual(observation.properties.daily, [
    { date: "2026-07-28", discharge: 2.83 },
    { date: "2026-07-29", discharge: 8.4 }
  ]);
  // GloFAS snaps to its own grid cell, so the geometry is the model cell.
  assert.deepEqual(observation.geometry.coordinates, [-77.07499, 38.975006]);
});

test("nasa-power keeps the monthly climatology keys", async () => {
  const fetch = async () => response({
    geometry: { coordinates: [-77.095, 38.985, 70.81] },
    properties: {
      parameter: {
        ALLSKY_SFC_SW_DWN: { JAN: 2.173, JUL: 6.0444, ANN: 4.1196 },
        T2M: { JAN: 0.11, JUL: 25.5, ANN: 13.15 }
      }
    }
  });

  const [observation] = await nasaPower.observe({ lat: 38.9847, lon: -77.0947 }, { fetch });

  assert.equal(observation.properties.solarIrradiance.ANN, 4.1196);
  assert.equal(observation.properties.temperature.JUL, 25.5);
  assert.equal(observation.properties.elevationMeters, 70.81);
  assert.deepEqual(observation.geometry.coordinates, [-77.095, 38.985]);
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
