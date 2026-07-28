# obsat

Obsat probes a latitude and longitude and asks every registered source what it knows about that place.

It runs locally. There is no Obsat server. Your computer calls each public provider directly.

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
  radiusKm: 25,
  limit: 10
});

console.log(result);
```

Obsat returns one object:

```js
{
  location: { lat, lon },
  queriedAt: "...",
  sources: ["sentinel-2", "usgs-earthquakes", "..."],
  observations: [],
  errors: []
}
```

One broken or unavailable source does not stop the others. Its error is added to `errors`.

## Query only some sources

```js
const result = await obsat.probe({
  lat: 38.8977,
  lon: -77.0365,
  sources: ["sentinel-2", "nws-weather", "usgs-water"]
});
```

List the available sources:

```js
console.log(obsat.sources());
```

## Built-in sources

### Global satellite sources

| ID | Data | Search key needed | Asset-download note |
| --- | --- | --- | --- |
| `sentinel-1` | Sentinel-1 radar scenes | No | Some raster assets may need provider signing |
| `sentinel-1-rtc` | Terrain-corrected Sentinel-1 radar | No | Microsoft account is required to download RTC rasters |
| `sentinel-2` | Sentinel-2 optical scenes | No | Public STAC assets |
| `landsat` | Landsat 8 and 9 surface reflectance | No | Public USGS assets |
| `hls-landsat` | NASA harmonized Landsat scenes | No | Public catalog assets |
| `hls-sentinel` | NASA harmonized Sentinel-2 scenes | No | Public catalog assets |

Obsat currently searches scene metadata and returns the asset links exposed by each STAC item. It does not automatically download multi-gigabyte raster files.

### Ground and environmental sources

| ID | Coverage | Data | Key needed |
| --- | --- | --- | --- |
| `usgs-earthquakes` | Global | Nearby earthquakes | No |
| `usgs-elevation` | United States | Ground elevation | No |
| `nws-weather` | United States | Weather grid and hourly forecast | No |
| `usgs-water` | United States | Nearby active water stations and current readings | No |
| `airnow` | Mostly United States | Air quality observations | Yes |

Some sources only cover the United States. Outside their coverage they may return no observations or an error. Other sources still run.

## Keys

The built-in satellite search, earthquake, elevation, weather, and water adapters do not need keys.

Only AirNow needs a key for the current probe adapters.

### Get an AirNow key

1. Open `https://docs.airnowapi.org/account/request/`.
2. Create a free account.
3. Copy the API key AirNow gives you.
4. Set this environment variable:

```bash
export OBSAT_AIRNOW_API_KEY="your-key-here"
```

On Windows PowerShell:

```powershell
$env:OBSAT_AIRNOW_API_KEY="your-key-here"
```

Then run Obsat normally. Do not put the real key in Git.

### Use a `.env` file

Obsat does not load `.env` files itself. This keeps the package dependency-free.

Your application can use Node's built-in environment-file option:

```bash
node --env-file=.env app.js
```

Create `.env`:

```dotenv
OBSAT_AIRNOW_API_KEY=your-key-here
```

Add this to `.gitignore`:

```gitignore
.env
.env.*
!.env.example
```

## Local MCP server

Obsat includes a local MCP server over standard input and output.

It exposes two tools:

- `obsat_probe` — query a latitude and longitude.
- `obsat_sources` — list registered sources and required environment variables.

Run it from this repository:

```bash
npm run mcp
```

After the `obsat` package is published to npm, run its MCP command with:

```bash
npx -p obsat obsat-mcp
```

Example MCP client configuration for a local checkout:

```json
{
  "mcpServers": {
    "obsat": {
      "command": "node",
      "args": ["/absolute/path/to/obsat/src/mcp.js"],
      "env": {
        "OBSAT_AIRNOW_API_KEY": "your-key-here"
      }
    }
  }
}
```

Example configuration after npm publication:

```json
{
  "mcpServers": {
    "obsat": {
      "command": "npx",
      "args": ["-y", "-p", "obsat", "obsat-mcp"],
      "env": {
        "OBSAT_AIRNOW_API_KEY": "your-key-here"
      }
    }
  }
}
```

The AI can call `obsat_probe` with:

```json
{
  "lat": 38.8977,
  "lon": -77.0365,
  "radiusKm": 25,
  "limit": 10
}
```

Omit `sources` to ask every registered adapter. Pass `sources` when the AI only needs certain data.

## CLI

```bash
obsat satellites
obsat observe 38.8977 -77.0365 --limit 5
```

The MCP server and JavaScript API are the main interfaces. The CLI is a small debugging tool.

## Add another source

Every source is one adapter in the same registry.

```js
const adapter = {
  id: "my-sensor",
  name: "My Sensor Network",
  kind: "ground-sensor",
  provider: "Example provider",
  collections: ["temperature"],
  env: ["MY_SENSOR_API_KEY"],

  async observe({ lat, lon }, { fetch, env }) {
    const key = env.MY_SENSOR_API_KEY;

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

Required adapter fields:

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

Obsat returns everything its registered sources can provide. It cannot literally know every fact about a location. Add more adapters to increase coverage. Each observation keeps its provider, time, location, properties, source link, and raw evidence so an AI can reason from evidence instead of a summary.

## Test

```bash
npm test
```

## License

MIT
