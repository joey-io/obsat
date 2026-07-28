import { USER_AGENT } from "../version.js";

// Wikipedia's geosearch index is the cheapest source of human context for a
// point: what has been written about the things standing here.
export const wikipedia = {
  id: "wikipedia",
  name: "Wikipedia Nearby Articles",
  kind: "reference",
  provider: "Wikimedia Foundation",
  collections: ["nearby-articles"],
  attribution: "Wikipedia contributors, CC BY-SA 4.0",
  license: "CC-BY-SA-4.0",

  async observe({ lat, lon, radiusKm = 5, limit = 20 }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "geosearch");
    url.searchParams.set("gscoord", `${lat}|${lon}`);
    // The API caps the radius at 10 km and the page count at 500.
    url.searchParams.set("gsradius", String(clamp(Math.round(radiusKm * 1000), 10, 10000)));
    url.searchParams.set("gslimit", String(clamp(limit, 1, 500)));
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const response = await fetchImpl(url, { headers: { "user-agent": USER_AGENT } });
    if (!response.ok) throw new Error(`wikipedia request failed: ${response.status}`);
    const data = await response.json();

    return (data?.query?.geosearch ?? []).map((page) => ({
      id: `wikipedia:${page.pageid}`,
      adapter: "wikipedia",
      kind: "article",
      observedAt: null,
      geometry: { type: "Point", coordinates: [page.lon, page.lat] },
      properties: {
        title: page.title,
        pageId: page.pageid,
        distanceMeters: page.dist ?? null
      },
      source: `https://en.wikipedia.org/?curid=${page.pageid}`,
      raw: page
    }));
  }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
