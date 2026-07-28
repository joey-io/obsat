import { USER_AGENT } from "../version.js";

// Reverse geocoding answers the question every other adapter assumes: what
// place is this? Without it a probe returns soil, weather, and radar for an
// anonymous pair of numbers.
export const nominatim = {
  id: "nominatim",
  name: "Nominatim Reverse Geocode",
  kind: "place",
  provider: "OpenStreetMap contributors",
  collections: ["reverse-geocode"],
  attribution: "© OpenStreetMap contributors, ODbL 1.0",
  license: "ODbL-1.0",

  async observe({ lat, lon }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");

    // Nominatim's usage policy requires an identifying User-Agent. Anonymous
    // clients get blocked rather than rate-limited.
    const response = await fetchImpl(url, { headers: { "user-agent": USER_AGENT } });
    if (!response.ok) throw new Error(`nominatim request failed: ${response.status}`);
    const data = await response.json();

    // Open water and other unaddressed points return an `error` body with a 200.
    if (!data || data.error) return [];

    const address = data.address ?? {};
    return [{
      id: `nominatim:${data.osm_type ?? "point"}:${data.osm_id ?? `${lat},${lon}`}`,
      adapter: "nominatim",
      kind: "place",
      observedAt: null,
      geometry: {
        type: "Point",
        coordinates: [Number(data.lon ?? lon), Number(data.lat ?? lat)]
      },
      properties: {
        displayName: data.display_name ?? null,
        name: data.name || null,
        category: data.category ?? null,
        type: data.type ?? null,
        addressType: data.addresstype ?? null,
        // Municipal naming varies by country, so fall through the levels
        // OpenStreetMap actually populates instead of assuming "city".
        locality: address.city ?? address.town ?? address.village ?? address.hamlet ?? null,
        neighbourhood: address.neighbourhood ?? address.suburb ?? null,
        county: address.county ?? null,
        state: address.state ?? null,
        postcode: address.postcode ?? null,
        country: address.country ?? null,
        countryCode: address.country_code ? address.country_code.toUpperCase() : null,
        address
      },
      source: data.osm_type && data.osm_id
        ? `https://www.openstreetmap.org/${data.osm_type}/${data.osm_id}`
        : url.toString(),
      raw: data
    }];
  }
};
