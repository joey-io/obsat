#!/usr/bin/env node

import { obsat } from "./index.js";

const [command, ...args] = process.argv.slice(2);

if (!command || command === "help" || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

try {
  if (command === "satellites") {
    console.log(JSON.stringify(obsat.satellites(), null, 2));
    process.exit(0);
  }

  if (command === "observe") {
    const [latValue, lonValue] = args;
    const lat = Number(latValue);
    const lon = Number(lonValue);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error("observe requires numeric latitude and longitude");
    }

    const satellites = readOption(args, "--satellites")?.split(",").filter(Boolean);
    const since = readOption(args, "--since");
    const until = readOption(args, "--until");
    const limitValue = readOption(args, "--limit");
    const limit = limitValue === undefined ? undefined : Number(limitValue);

    const result = await obsat.observe({ lat, lon, satellites, since, until, limit });
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

function printHelp() {
  console.log(`obsat

Usage:
  obsat satellites
  obsat observe <lat> <lon> [options]

Options:
  --satellites <ids>  Comma-separated adapter IDs
  --since <datetime>  Start of observation window
  --until <datetime>  End of observation window
  --limit <number>    Maximum scenes per adapter
  -h, --help          Show help

Examples:
  obsat satellites
  obsat observe 38.8977 -77.0365
  obsat observe 35.6892 51.3890 --satellites sentinel-2 --limit 3
`);
}
