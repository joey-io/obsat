// Single source of truth for the version Obsat reports to the outside world.
//
// It is used for the outbound User-Agent header (Nominatim, Overpass, and the
// National Weather Service all ask clients to identify themselves) and for the
// MCP `serverInfo.version` handshake.
//
// This must match the `version` field in package.json. A unit test asserts the
// two stay in sync, so bumping package.json without bumping this file fails the
// build rather than silently shipping a stale User-Agent.
export const OBSAT_VERSION = "0.3.0";

// Providers that rate-limit anonymous traffic want a contact URL, not just a
// product name. Sending a bare "node-fetch" style agent is what gets clients
// blocked from Nominatim and Overpass.
export const USER_AGENT = `obsat/${OBSAT_VERSION} (+https://github.com/joey-io/obsat)`;
