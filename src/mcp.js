#!/usr/bin/env node

import readline from "node:readline";
import { obsat } from "./index.js";

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", async (line) => {
  if (!line.trim()) return;

  let message;
  try { message = JSON.parse(line); }
  catch { writeError(null, -32700, "Parse error"); return; }

  if (message.id === undefined) return;

  try {
    if (message.method === "initialize") {
      writeResult(message.id, {
        protocolVersion: message.params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "obsat", version: "0.2.0" }
      });
      return;
    }
    if (message.method === "ping") { writeResult(message.id, {}); return; }
    if (message.method === "tools/list") { writeResult(message.id, { tools: tools() }); return; }

    if (message.method === "tools/call") {
      const name = message.params?.name;
      const args = message.params?.arguments ?? {};
      if (name === "obsat_probe") return writeToolResult(message.id, await obsat.probe(args));
      if (name === "obsat_sources") return writeToolResult(message.id, obsat.sources());
      if (name === "obsat_capabilities") return writeToolResult(message.id, obsat.capabilities());
      if (name === "obsat_provider") {
        const source = obsat.sources().find((item) => item.id === args.id);
        if (!source) throw new Error(`Unknown source: ${args.id}`);
        return writeToolResult(message.id, source);
      }
      if (name === "obsat_doctor") return writeToolResult(message.id, obsat.doctor());
      writeError(message.id, -32602, `Unknown tool: ${name}`);
      return;
    }

    writeError(message.id, -32601, `Method not found: ${message.method}`);
  } catch (error) {
    writeResult(message.id, {
      content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
      isError: true
    });
  }
});

function tools() {
  return [
    {
      name: "obsat_probe",
      title: "Probe a location",
      description: "Query enabled Earth-observation sources for a latitude and longitude and return normalized evidence.",
      inputSchema: {
        type: "object",
        properties: {
          lat: { type: "number", minimum: -90, maximum: 90 },
          lon: { type: "number", minimum: -180, maximum: 180 },
          sources: { type: "array", items: { type: "string" } },
          since: { type: "string" },
          until: { type: "string" },
          radiusKm: { type: "number", minimum: 0.1 },
          limit: { type: "integer", minimum: 1, maximum: 100 }
        },
        required: ["lat", "lon"]
      }
    },
    {
      name: "obsat_sources",
      title: "List sources",
      description: "List registered satellite, sensor, terrain, weather, and map adapters.",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "obsat_provider",
      title: "Get source details",
      description: "Return metadata, coverage, status, environment variables, attribution, and license for one source.",
      inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
    },
    {
      name: "obsat_capabilities",
      title: "List capabilities",
      description: "List source capabilities and whether required credentials are configured.",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "obsat_doctor",
      title: "Check Obsat",
      description: "Check the local runtime, fetch support, registered sources, and missing environment variables.",
      inputSchema: { type: "object", properties: {} }
    }
  ];
}

function writeToolResult(id, value) {
  writeResult(id, {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value,
    isError: false
  });
}

function writeResult(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function writeError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}
