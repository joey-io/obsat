import { createStacAdapter } from "./stac.js";

// HLS is published through NASA's CMR STAC catalog, not Earth Search. Pointing
// this at earth-search.aws.element84.com returned an empty feature list on
// every probe, because that server does not host an hls-l30 collection at all.
export const hlsLandsat = createStacAdapter({
  id: "hls-landsat",
  name: "NASA Harmonized Landsat Sentinel-2: Landsat",
  satellite: "Landsat 8/9",
  endpoint: "https://cmr.earthdata.nasa.gov/stac/LPCLOUD/search",
  collections: ["HLSL30_2.0"],
  sortByNewest: true
});
