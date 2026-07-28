// NASA FIRMS publishes active-fire detections from the VIIRS instruments
// within a few hours of satellite overpass. A thermal anomaly here is the
// difference between a scene that looks hazy and a fire that is burning now.
//
// FIRMS requires a free MAP_KEY, so without it this adapter is skipped.
export const nasaFirms = {
  id: "nasa-firms",
  name: "NASA FIRMS Active Fire Detections",
  kind: "satellite",
  provider: "NASA FIRMS",
  satellite: "Suomi NPP / NOAA-20 VIIRS",
  collections: ["active-fire"],
  env: ["OBSAT_NASA_FIRMS_MAP_KEY"],
  attribution: "NASA FIRMS",

  async observe({ lat, lon, radiusKm = 50, limit = 50 }, context = {}) {
    const key = (context.env ?? process.env).OBSAT_NASA_FIRMS_MAP_KEY;
    if (!key) throw new Error("nasa-firms requires OBSAT_NASA_FIRMS_MAP_KEY");
    const fetchImpl = context.fetch ?? globalThis.fetch;

    const delta = Math.max(0.01, radiusKm / 111);
    // FIRMS area endpoint takes west,south,east,north and returns CSV. The
    // trailing segment is the number of days back, capped at 10.
    const area = [lon - delta, lat - delta, lon + delta, lat + delta]
      .map((edge) => Number(edge.toFixed(4)))
      .join(",");
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/${area}/1`;

    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`nasa-firms request failed: ${response.status}`);
    const text = await response.text();

    // An invalid key returns HTTP 200 with a plain-text error rather than CSV.
    if (/invalid|error/i.test(text.slice(0, 200)) && !text.startsWith("latitude")) {
      throw new Error(`nasa-firms rejected the request: ${text.trim().slice(0, 120)}`);
    }

    return parseCsv(text).slice(0, limit).map((row, index) => ({
      id: `nasa-firms:${row.latitude},${row.longitude}:${row.acq_date}T${row.acq_time}:${index}`,
      adapter: "nasa-firms",
      kind: "fire-detection",
      observedAt: toIso(row.acq_date, row.acq_time),
      geometry: {
        type: "Point",
        coordinates: [Number(row.longitude), Number(row.latitude)]
      },
      properties: {
        brightnessKelvin: toNumber(row.bright_ti4),
        // FIRMS confidence for VIIRS is l/n/h (low, nominal, high).
        confidence: row.confidence ?? null,
        fireRadiativePower: toNumber(row.frp),
        satellite: row.satellite ?? null,
        instrument: row.instrument ?? null,
        dayNight: row.daynight ?? null,
        scan: toNumber(row.scan),
        track: toNumber(row.track)
      },
      source: "https://firms.modaps.eosdis.nasa.gov/",
      raw: row
    }));
  }
};

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

// FIRMS reports acq_time as an HHMM string, sometimes without the leading zero.
function toIso(date, time) {
  if (!date) return null;
  const padded = String(time ?? "0").padStart(4, "0");
  return `${date}T${padded.slice(0, 2)}:${padded.slice(2, 4)}:00Z`;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
