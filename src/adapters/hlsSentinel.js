import { createStacAdapter } from "./stac.js";

export const hlsSentinel = createStacAdapter({
  id: "hls-sentinel",
  name: "NASA Harmonized Landsat Sentinel-2: Sentinel",
  satellite: "Sentinel-2",
  endpoint: "https://earth-search.aws.element84.com/v1/search",
  collections: ["hls-s30"]
});
