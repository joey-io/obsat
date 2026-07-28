#!/usr/bin/env node

import { obsat } from "./index.js";

const [command, ...args] = process.argv.slice(2);

if (!command || command === "help" || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

try {
  if (command === "sources") {
    console.log(JSON.stringify(obsat.sources(), null, 2));
    process.exit(0);
  }

  if (command === "satellites") {
    console.log(JSON.stringify(obsat.satellites(), null, 2));
    process.exit(0);
  }

  if (command === "probe" || command === "observe") {
    const [latValue, lonValue] = args;
    const lat = Number(latValue);
    const lon = Number(lonValue);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error(`${command} requires numeric latitude and longitude`);
    }

    const sources = readOption(args, "--sources")?.split(",").filter(Boolean)
      ?? readOption(args, "--satellites")?.split(",").filter(Boolean);
    const since = readOption(args, "--since");
    const until = readOption(args, "--until");
    const limit = readNumberOption(args, "--limit");
    const radiusKm = readNumberOption(args, "--radius-km");

    const result = await obsat.probe({ lat, lon, sources, since, until, limit, radiusKm });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.errors.length ? 1 : 0);
  }

  throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(`obsat: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function readOption(values, name) {
  const index = values.indexOf(name);
  return index === -1 ? undefined : values[index + 1];
}

function readNumberOption(values, name) {
  const value = readOption(values, name);
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${name} requires a number`);
  return number;
}

function printHelp() {
  console.log(`obsat

Usage:
  obsat sources
  obsat satellites
  obsat probe <lat> <lon> [options]

Options:
  --sources <ids>     Comma-separated adapter IDs. Omit to query all.
  --radius-km <km>    Search radius for nearby sensors, events, and map features.
  --since <datetime>  Start of observation window.
  --until <datetime>  End of observation window.
  --limit <number>    Maximum results per adapter.
  -h, --help          Show help.

Examples:
  obsat sources
  obsat probe 38.8977 -77.0365
  obsat probe 35.6892 51.3890 --radius-km 10
  obsat probe 38.8977 -77.0365 --sources open-meteo,open-meteo-air,openstreetmap
`);
}