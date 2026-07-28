#!/usr/bin/env node

import readline from "node:readline";
import { obsat } from "./index.js";

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", async (line) => {
  if (!line.trim()) return;

  let message;
  try {
    message = JSON.parse(line);
  } catch {
    writeError(null, -32700, "Parse error");
    return;
  }

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

    if (message.method === "ping") {
      writeResult(message.id, {});
      return;
    }

    if (message.method === "tools/list") {
      writeResult(message.id, { tools: tools() });
      return;
    }

    if (message.method === "tools/call") {
      const name = message.params?.name;
      const args = message.params?.arguments ?? {};

      if (name === "obsat_sources") {
        const result = obsat.sources();
        writeToolResult(message.id, result);
        return;
      }

      if (name === "obsat_probe") {
        const result = await obsat.probe(args);
        writeToolResult(message.id, result);
        return;
      }

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
      description: "Query every enabled satellite and ground-source adapter for a latitude and longitude. Returns normalized evidence for AI reasoning.",
      inputSchema: {
        type: "object",
        properties: {
          lat: { type: "number", minimum: -90, maximum: 90 },
          lon: { type: "number", minimum: -180, maximum: 180 },
          sources: { type: "array", items: { type: "string" }, description: "Optional adapter IDs. Omit to query all." },
          since: { type: "string", description: "Optional ISO date/time start." },
          until: { type: "string", description: "Optional ISO date/time end." },
          radiusKm: { type: "number", minimum: 0.1, description: "Search radius for nearby sensors and events." },
          limit: { type: "integer", minimum: 1, maximum: 100 }
        },
        required: ["lat", "lon"]
      }
    },
    {
      name: "obsat_sources",
      title: "List Obsat sources",
      description: "List every registered satellite, sensor, terrain, and weather adapter and its required environment variables.",
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
