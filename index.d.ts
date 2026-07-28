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

export interface ProbeResult {
  location: { lat: number; lon: number };
  queriedAt: string;
  sources: string[];
  observations: Evidence[];
  errors: Array<{ source: string; message: string }>;
}

export interface Adapter {
  id: string;
  name: string;
  kind?: string;
  provider?: string;
  satellite?: string;
  collections?: string[];
  env?: string[];
  status?: AdapterStatus;
  coverage?: string;
  attribution?: string;
  license?: string;
  observe(request: ProbeRequest, context: { fetch?: typeof globalThis.fetch; env?: NodeJS.ProcessEnv }): Promise<unknown[]>;
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

export const adapters: Adapter[];
export const obsat: Obsat;
