import { createStacAdapter } from "./stac.js";

// See hlsLandsat.js: HLS lives in NASA CMR, not Earth Search. Searching is
// open; downloading the assets themselves needs an Earthdata login.
export const hlsSentinel = createStacAdapter({
  id: "hls-sentinel",
  name: "NASA Harmonized Landsat Sentinel-2: Sentinel",
  satellite: "Sentinel-2",
  endpoint: "https://cmr.earthdata.nasa.gov/stac/LPCLOUD/search",
  collections: ["HLSS30_2.0"],
  sortByNewest: true
});
