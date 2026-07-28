# obsat

Obsat probes one latitude and longitude and asks every registered data source what it knows about that place.

It runs on the user's computer. There is no Obsat server. Obsat calls each provider directly.

## Install

```bash
npm install obsat
```

Node.js 20 or newer is required.

## Probe a location

```js
import { obsat } from "obsat";

const result = await obsat.probe({
  lat: 38.8977,
  lon: -77.0365,
  radiusKm: 10,
  limit: 10
});

console.log(result);
```

Obsat returns:

```js
{
  location: { lat, lon },
  queriedAt: "...",
  sources: ["nominatim", "sentinel-2", "open-meteo", "..."],  // adapters that ran
  skipped: [],       // adapters held back for a missing API key
  observations: [],
  errors: []
}
```

One broken source does not stop the others. Its error is placed in `errors`.

An adapter that needs an API key you have not set is **skipped before the
request is made**, not run and failed. It appears in `skipped` with the
variable it is waiting on:

```js
{
  source: "airnow",
  missingEnv: ["OBSAT_AIRNOW_API_KEY"],
  reason: "airnow needs OBSAT_AIRNOW_API_KEY"
}
```

So `errors` only ever contains things that actually went wrong.

### What one observation looks like

Every adapter is normalized to the same record:

```js
{
  id: "S1D_IW_GRDH_...",
  source: "sentinel-1",          // the adapter's id
  provider: "Copernicus Sentinel-1 GRD",
  kind: "observation",
  observedAt: "2026-07-17T23:06:27Z",
  geometry: { type: "Polygon", coordinates: [...] },
  bbox: [-78.92, 37.56, -75.70, 39.46],
  properties: { ... },           // the useful, adapter-specific fields
  assets: { ... },               // provider download links, for satellite scenes
  evidence: {
    url: "https://...",          // this record at the provider
    retrievedAt: "2026-07-28T04:01:34Z",
    collection: "sentinel-1-grd"
  },
  attribution: "Copernicus Sentinel-1 GRD",
  license: null,
  raw: { ... }                   // the untouched provider response
}
```

`source` is the adapter id. The URL an adapter supplies for a record moves to
`evidence.url`.

## Probe only some sources

```js
await obsat.probe({
  lat: 38.8977,
  lon: -77.0365,
  sources: ["sentinel-2", "open-meteo", "openstreetmap"]
});
```

List all source IDs:

```js
console.log(obsat.sources());
```

## Built-in sources

24 adapters. 20 of them need no key at all.

### Where am I

| ID | What it returns | Key needed |
| --- | --- | --- |
| `nominatim` | Reverse geocode: address, locality, county, state, country | No |
| `census-geographies` | US state, county, tract, block, congressional and legislative districts | No |
| `wikipedia` | Nearby Wikipedia articles with distance | No |
| `openstreetmap` | Nearby roads, buildings, land use, water, natural features, and named places | No |

### Satellite

| ID | What it returns | Key needed |
| --- | --- | --- |
| `sentinel-1` | Radar scene metadata and asset links | No |
| `sentinel-1-rtc` | Terrain-corrected radar scene metadata | No for search |
| `sentinel-2` | Optical scene metadata and asset links | No |
| `landsat` | Landsat 8 and 9 surface-reflectance scenes | No |
| `hls-landsat` | NASA harmonized Landsat scenes, via CMR | No to search |
| `hls-sentinel` | NASA harmonized Sentinel-2 scenes, via CMR | No to search |
| `nasa-firms` | Active fire detections from VIIRS, last 24 hours | Yes |

### Terrain and geophysics

| ID | What it returns | Key needed |
| --- | --- | --- |
| `usgs-elevation` | Ground elevation from 3DEP, often at 1 m. United States | No |
| `open-meteo-elevation` | Ground elevation from Copernicus DEM at 90 m. Global | No |
| `usgs-earthquakes` | Nearby earthquakes | No |

### Atmosphere

| ID | What it returns | Key needed |
| --- | --- | --- |
| `open-meteo` | Current weather, forecast, soil temperature, and soil moisture | No |
| `open-meteo-air` | PM2.5, PM10, ozone, dust, AQI, and other air-quality data | No |
| `nasa-power` | 40-year climate normals: solar irradiance, temperature, rainfall, wind | No |
| `nws-weather` | National Weather Service grid and hourly forecast. United States | No |
| `airnow` | Measured air-quality observations. United States | Yes |
| `openaq` | Air-quality monitoring stations and the pollutants they report. Global | Yes |

### Water

| ID | What it returns | Key needed |
| --- | --- | --- |
| `usgs-water` | Nearby active water stations and current readings. United States | No |
| `open-meteo-flood` | River discharge now and seven days ahead, from GloFAS. Global | No |

### Life and record

| ID | What it returns | Key needed |
| --- | --- | --- |
| `gbif` | Species occurrence records: specimens, surveys, and citizen-science sightings | No |
| `epa-echo` | Regulated facilities with compliance, inspection, and penalty history. United States | No |

Satellite adapters search catalogs. They return scene metadata and provider asset links. They do not automatically download large raster files.

Adapters marked "United States" return nothing outside their coverage area rather than failing.

## Keys

Most built-in sources need no key. Three do, and all three are free.

An adapter whose key is missing is skipped, so you can ignore this section
entirely and still get 20 working sources.

| Adapter | Variable | Where to request one |
| --- | --- | --- |
| `airnow` | `OBSAT_AIRNOW_API_KEY` | `https://docs.airnowapi.org/account/request/` |
| `openaq` | `OBSAT_OPENAQ_API_KEY` | `https://explore.openaq.org/register` |
| `nasa-firms` | `OBSAT_NASA_FIRMS_MAP_KEY` | `https://firms.modaps.eosdis.nasa.gov/api/area/` |

Check what is configured:

```bash
obsat auth status
```

### AirNow

1. Go to `https://docs.airnowapi.org/account/request/`.
2. Request a free account.
3. Copy the API key from AirNow.
4. Set it before starting Obsat:

macOS or Linux:

```bash
export OBSAT_AIRNOW_API_KEY="your-key"
```

Windows PowerShell:

```powershell
$env:OBSAT_AIRNOW_API_KEY="your-key"
```

Do not commit the key to Git.

### `.env`

Obsat does not load `.env` files itself. Node can load one:

```bash
node --env-file=.env app.js
```

`.env`:

```dotenv
OBSAT_AIRNOW_API_KEY=your-key
```

`.gitignore`:

```gitignore
.env
.env.*
!.env.example
```

## CLI

```bash
obsat sources
obsat probe 38.8977 -77.0365
obsat probe 38.8977 -77.0365 --radius-km 10 --limit 20
obsat probe 38.8977 -77.0365 --sources open-meteo,open-meteo-air,openstreetmap
```

`observe` remains an alias for `probe`.

| Command | What it does |
| --- | --- |
| `sources` | Every registered adapter and its metadata |
| `satellites` | Only the satellite adapters |
| `capabilities` | Adapters plus whether their credentials are configured |
| `doctor` | Node version, fetch support, and missing environment variables |
| `auth status` | Which adapters have their required keys set |
| `probe <lat> <lon>` | Query adapters for one point |

| Option | What it does |
| --- | --- |
| `--sources <ids>` | Comma-separated adapter IDs. Omit to query all. |
| `--radius-km <km>` | Search radius for nearby sensors, events, and map features |
| `--since <datetime>` | Start of observation window |
| `--until <datetime>` | End of observation window |
| `--limit <number>` | Maximum results per adapter |

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | At least one adapter ran. A partial result is still a success. |
| `1` | Every adapter that ran failed, no adapter could run, or the command was invalid. |

A source being down does not fail the command. That is the case Obsat is built
for, so it must not break a shell pipeline.

## Local MCP server

Obsat includes a local MCP server over standard input and output.

It exposes:

- `obsat_probe` — probe a latitude and longitude.
- `obsat_sources` — list adapters and required environment variables.
- `obsat_provider` — metadata, coverage, status, attribution, and license for one source.
- `obsat_capabilities` — which adapters are configured and ready to run.
- `obsat_doctor` — local runtime, fetch support, and missing environment variables.

Run it from a checkout:

```bash
npm run mcp
```

MCP client configuration for a checkout:

```json
{
  "mcpServers": {
    "obsat": {
      "command": "node",
      "args": ["/absolute/path/to/obsat/src/mcp.js"],
      "env": {
        "OBSAT_AIRNOW_API_KEY": "your-key"
      }
    }
  }
}
```

After npm publication:

```json
{
  "mcpServers": {
    "obsat": {
      "command": "npx",
      "args": ["-y", "-p", "obsat", "obsat-mcp"],
      "env": {
        "OBSAT_AIRNOW_API_KEY": "your-key"
      }
    }
  }
}
```

The AI calls `obsat_probe` with:

```json
{
  "lat": 38.8977,
  "lon": -77.0365,
  "radiusKm": 10,
  "limit": 10
}
```

Omit `sources` to query every adapter. A source that needs a key you have not
set is skipped and reported under `skipped`, so the model can tell "not
configured" apart from "failed".

## Add an adapter

Every provider is one adapter in the registry:

```js
const adapter = {
  id: "my-sensor",
  name: "My Sensor",
  kind: "ground-sensor",
  provider: "My provider",
  collections: ["temperature"],
  env: ["MY_SENSOR_API_KEY"],

  async observe({ lat, lon }, { fetch, env }) {
    return [{
      id: "reading-1",
      kind: "temperature",
      observedAt: new Date().toISOString(),
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: { temperature: 20 },
      source: "https://my-provider.example/readings/1",
      raw: null
    }];
  }
};

obsat.use(adapter);
```

The required shape is small:

```ts
type Adapter = {
  id: string;
  name: string;
  kind?: string;
  provider?: string;
  collections?: string[];
  env?: string[];
  observe(request, context): Promise<RawObservation[]>;
};
```

Two things to know about what `observe` returns:

- The `source` you set is the link to that record at the provider. Obsat moves
  it to `evidence.url` and sets the normalized `source` to your adapter's `id`.
  You do not set the adapter id on each record.
- Fields outside the documented shape are dropped. Put provider-specific data
  in `properties`, and the untouched response in `raw`.

Listing anything in `env` makes it required. If the variable is not set, Obsat
skips the adapter instead of calling `observe`, so you can assume your key is
present by the time your code runs. Keep the guard anyway for direct calls:

```js
const key = (env ?? process.env).MY_SENSOR_API_KEY;
if (!key) throw new Error("my-sensor requires MY_SENSOR_API_KEY");
```

Always use the `fetch` from `context`. It is what the test suite substitutes.

## Important limit

Obsat cannot literally know every fact about a place. It returns everything the installed adapters can find. Add adapters to add coverage. Each result keeps the source, time, geometry, properties, source link, and raw provider response so an AI can reason from evidence.

## Test

```bash
npm test
```

## License

MIT
