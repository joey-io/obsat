# Changelog

All notable changes to Obsat are documented here.

## 0.3.0

### Added

- Adapters that require an API key you have not set are now **skipped** instead
  of run and failed. They are reported in a new `skipped` array on the probe
  result, so `errors` only contains real failures.
- Ten new adapters, eight of which need no key:
  - `nominatim` — reverse geocode a point to an address, locality, and country.
  - `census-geographies` — US state, county, tract, block, and district GEOIDs.
  - `wikipedia` — nearby articles with distance.
  - `gbif` — species occurrence records.
  - `open-meteo-elevation` — global elevation, complementing US-only 3DEP.
  - `open-meteo-flood` — river discharge now and seven days ahead, from GloFAS.
  - `nasa-power` — 40-year climate normals for solar, temperature, and rainfall.
  - `epa-echo` — US regulated facilities with compliance and penalty history.
  - `openaq` — global air-quality stations. Needs `OBSAT_OPENAQ_API_KEY`.
  - `nasa-firms` — active fire detections. Needs `OBSAT_NASA_FIRMS_MAP_KEY`.
- `src/version.js` as the single source of the version used in the outbound
  User-Agent and the MCP handshake, with a test that keeps it in step with
  package.json.
- `RawObservation`, `AdapterContext`, and `SkippedSource` TypeScript types, and
  declarations for every exported adapter.

### Fixed

- `usgs-water` returned a 400 on every probe. NWIS rejects bbox values with
  more than 7 decimal places, and `radiusKm / 111` produces 14. Edges are now
  rounded.
- `usgs-elevation` read `valueDate` and `dataSource`, neither of which EPQS
  returns, and passed the elevation through as a string. It now returns a
  number, the real acquisition date from `attributes.AcquisitionDate`, and the
  source raster's resolution and id.
- The CLI truncated any result larger than 64 KB when stdout was a pipe.
  `process.exit()` discarded the buffered write; the exit code is now set and
  Node is allowed to drain stdout before exiting.
- The CLI exited `1` whenever any single source errored. Because AirNow always
  failed without a key, every default probe exited non-zero. Exit is now `1`
  only when every adapter that ran failed, or none could run.
- `hls-landsat` and `hls-sentinel` silently returned nothing on every probe.
  Both pointed at Earth Search, which does not host the HLS collections. They
  now query NASA's CMR STAC catalog (`HLSL30_2.0` and `HLSS30_2.0`) and sort
  newest-first, since CMR otherwise answers in catalogue order and surfaced
  scenes from 2013.
- `epa-echo` requests the `FacLong` column explicitly. It is absent from ECHO's
  default column set, which left every facility without a position.
- `nws-weather` rounds coordinates to the 4 decimal places api.weather.gov
  keeps, avoiding a 301 redirect on every request.
- The outbound User-Agent claimed three different versions across two adapters
  and the MCP server, none of which matched package.json.

### Changed

- `sources` in the probe result now lists only the adapters that actually ran.
  Adapters held back for a missing key appear in `skipped`.
- The registry no longer assumes an adapter without a `kind` is a satellite.
  Built-in STAC adapters declare `kind: "satellite"` themselves; anything else
  defaults to `"observation"`.
- `epa-echo` sorts each page of facilities by distance before applying `limit`,
  so a small limit returns the nearest facilities rather than the ones that
  sort first alphabetically.

## 0.2.0

- Added a local-first location probe API.
- Added normalized evidence output.
- Added satellite, weather, air-quality, water, terrain, earthquake, and map adapters.
- Added a local MCP server.
- Added CLI diagnostics and source discovery.
- Added TypeScript declarations.
- Added GitHub Actions tests for Node.js 20 and 22.

## 0.1.0

- Added the adapter registry, STAC helper, Landsat adapter, Sentinel-2 adapter, CLI, and initial tests.
