export type AdapterStatus = "stable" | "experimental" | "community";

export interface ProbeRequest {
  lat: number;
  lon: number;
  sources?: string[];
  satellites?: string[];
  since?: string;
  until?: string;
  limit?: number;
  radiusKm?: number;
}

export interface Evidence {
  id: string;
  source: string;
  provider: string;
  kind: string;
  observedAt: string | null;
  geometry: unknown;
  bbox: number[] | null;
  properties: Record<string, unknown>;
  assets: Record<string, unknown>;
  evidence: { url: string | null; retrievedAt: string; collection: string | null };
  attribution: string;
  license: string | null;
  raw: unknown;
}

/**
 * An adapter that declares `env` but has no value for it is held back before
 * the request is made, so a missing key never appears as an error.
 */
export interface SkippedSource {
  source: string;
  missingEnv: string[];
  reason: string;
}

export interface ProbeResult {
  location: { lat: number; lon: number };
  queriedAt: string;
  /** Only the adapters that actually ran. */
  sources: string[];
  /** Adapters held back because a required key was not set. */
  skipped: SkippedSource[];
  observations: Evidence[];
  errors: Array<{ source: string; message: string }>;
}

/**
 * What an adapter's `observe` returns, before normalization.
 *
 * Note that `source` here is the evidence URL for a single record. Obsat moves
 * it to `evidence.url` and sets the normalized `source` to the adapter's id.
 * Anything not listed below — including an `adapter` field — is dropped, so
 * `raw` is the place to keep provider-specific data.
 */
export interface RawObservation {
  id?: string | number;
  kind?: string;
  observedAt?: string | null;
  geometry?: unknown;
  bbox?: number[] | null;
  properties?: Record<string, unknown>;
  assets?: Record<string, unknown>;
  collection?: string | null;
  /** Link to this record at the provider. Becomes `evidence.url`. */
  source?: string | null;
  attribution?: string;
  license?: string | null;
  raw?: unknown;
}

export interface AdapterContext {
  fetch?: typeof globalThis.fetch;
  env?: NodeJS.ProcessEnv;
}

export interface Adapter {
  id: string;
  name: string;
  kind?: string;
  provider?: string;
  satellite?: string;
  collections?: string[];
  /** Environment variables this adapter needs. Missing ones cause a skip. */
  env?: string[];
  status?: AdapterStatus;
  coverage?: string;
  attribution?: string;
  license?: string;
  observe(request: ProbeRequest, context: AdapterContext): Promise<RawObservation[]>;
}

export class AdapterRegistry {
  register(adapter: Adapter): this;
  get(id: string): Adapter | undefined;
  has(id: string): boolean;
  list(): Array<Record<string, unknown>>;
  resolve(ids?: string[]): Adapter[];
}

export class Obsat {
  constructor(options?: { adapters?: Adapter[]; fetch?: typeof globalThis.fetch; env?: NodeJS.ProcessEnv });
  registry: AdapterRegistry;
  use(adapter: Adapter): this;
  sources(): Array<Record<string, unknown>>;
  satellites(): Array<Record<string, unknown>>;
  capabilities(): Array<Record<string, unknown>>;
  doctor(): Record<string, unknown>;
  probe(options: ProbeRequest): Promise<ProbeResult>;
  observe(options: ProbeRequest): Promise<ProbeResult>;
}

export function createStacAdapter(options: {
  id: string;
  name: string;
  satellite?: string;
  endpoint: string;
  collections: string[];
  env?: string[];
}): Adapter;

/** Must match the `version` field in package.json; a test enforces it. */
export const OBSAT_VERSION: string;
/** Sent as the User-Agent to providers that require client identification. */
export const USER_AGENT: string;

export const adapters: Adapter[];
export const obsat: Obsat;

// Place and boundary
export const nominatim: Adapter;
export const census: Adapter;

// Satellite
export const sentinel1: Adapter;
export const sentinel1Rtc: Adapter;
export const sentinel2: Adapter;
export const landsat: Adapter;
export const hlsLandsat: Adapter;
export const hlsSentinel: Adapter;
export const nasaFirms: Adapter;

// Terrain and geophysics
export const elevation: Adapter;
export const openMeteoElevation: Adapter;
export const earthquakes: Adapter;

// Atmosphere
export const openMeteo: Adapter;
export const openMeteoAir: Adapter;
export const nasaPower: Adapter;
export const weather: Adapter;
export const airNow: Adapter;
export const openAq: Adapter;

// Water
export const water: Adapter;
export const openMeteoFlood: Adapter;

// Life, map, and record
export const gbif: Adapter;
export const openStreetMap: Adapter;
export const wikipedia: Adapter;
export const epaEcho: Adapter;
