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
  sources: ["sentinel-2", "open-meteo", "openstreetmap", "..."],
  observations: [],
  errors: []
}
```

One broken source does not stop the others. Its error is placed in `errors`.

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

### Global sources

| ID | What it returns | Key needed |
| --- | --- | --- |
| `sentinel-1` | Radar scene metadata and asset links | No |
| `sentinel-1-rtc` | Terrain-corrected radar scene metadata | No for search |
| `sentinel-2` | Optical scene metadata and asset links | No |
| `landsat` | Landsat 8 and 9 surface-reflectance scenes | No |
| `hls-landsat` | NASA harmonized Landsat scenes | No |
| `hls-sentinel` | NASA harmonized Sentinel-2 scenes | No |
| `usgs-earthquakes` | Nearby earthquakes | No |
| `open-meteo` | Current weather, forecast, soil temperature, and soil moisture | No |
| `open-meteo-air` | PM2.5, PM10, ozone, dust, AQI, and other air-quality data | No |
| `openstreetmap` | Nearby roads, buildings, land use, water, natural features, and named places | No |

### United States sources

| ID | What it returns | Key needed |
| --- | --- | --- |
| `usgs-elevation` | Ground elevation | No |
| `nws-weather` | National Weather Service grid and hourly forecast | No |
| `usgs-water` | Nearby active water stations and current readings | No |
| `airnow` | Measured air-quality observations | Yes |

Satellite adapters search catalogs. They return scene metadata and provider asset links. They do not automatically download large raster files.

## Keys

Most built-in sources need no key.

### AirNow

AirNow is the only built-in adapter that currently needs a key.

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

## Local MCP server

Obsat includes a local MCP server over standard input and output.

It exposes:

- `obsat_probe` — probe a latitude and longitude.
- `obsat_sources` — list adapters and required environment variables.

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

Omit `sources` to query every adapter. A source that needs a missing key returns an error while the other sources continue.

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
      adapter: "my-sensor",
      kind: "temperature",
      observedAt: new Date().toISOString(),
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: { temperature: 20 },
      source: null,
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
  observe(request, context): Promise<Observation[]>;
};
```

## Important limit

Obsat cannot literally know every fact about a place. It returns everything the installed adapters can find. Add adapters to add coverage. Each result keeps the source, time, geometry, properties, source link, and raw provider response so an AI can reason from evidence.

## Test

```bash
npm test
```

## License

MIT
