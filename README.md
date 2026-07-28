# obsat

A minimal, local-first Node.js runtime for querying public Earth-observation satellites through a shared adapter registry.

Obsat has no server. The package runs on the user's machine and talks directly to each provider.

## Install

```bash
npm install obsat
```

## Use

```js
import { obsat } from "obsat";

const result = await obsat.observe({
  lat: 38.8977,
  lon: -77.0365,
  since: "2026-07-01T00:00:00Z",
  limit: 5
});

console.log(result.observations);
console.log(result.errors);
```

Query one satellite adapter:

```js
const result = await obsat.observe({
  lat: 38.8977,
  lon: -77.0365,
  satellites: ["sentinel-2"]
});
```

List registered adapters:

```js
console.log(obsat.satellites());
```

## Built-in adapters

- `sentinel-2` — Copernicus Sentinel-2 L2A through Earth Search STAC.
- `landsat` — USGS Landsat 8/9 Collection 2 Level 2 surface reflectance.

Both built-in adapters use public STAC endpoints and require no Obsat account.

## Add an adapter

Each satellite is an adapter in the registry:

```js
import { Obsat } from "obsat";

const demoSatellite = {
  id: "demo",
  name: "Demo Satellite",
  satellite: "DemoSat-1",
  collections: ["demo-scenes"],

  async observe({ lat, lon }) {
    return [{
      id: "scene-1",
      adapter: "demo",
      satellite: "DemoSat-1",
      observedAt: new Date().toISOString(),
      geometry: { type: "Point", coordinates: [lon, lat] },
      assets: {},
      properties: {}
    }];
  }
};

const runtime = new Obsat({ adapters: [demoSatellite] });
```

The required adapter shape is intentionally small:

```ts
type Adapter = {
  id: string;
  name: string;
  satellite: string;
  collections: string[];
  observe(request, context): Promise<Observation[]>;
};
```

## Credentials

Adapters that require credentials should read user-owned environment variables through `context.env`. Obsat stores no credentials and sends no requests through an Obsat server.

A paid adapter must be explicitly installed and registered. The built-in package only includes free public sources.

## Test

```bash
npm test
```

## License

MIT
