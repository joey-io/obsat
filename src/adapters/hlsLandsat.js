import { createStacAdapter } from "./stac.js";

export const hlsLandsat = createStacAdapter({
  id: "hls-landsat",
  name: "NASA Harmonized Landsat Sentinel-2: Landsat",
  satellite: "Landsat 8/9",
  endpoint: "https://earth-search.aws.element84.com/v1/search",
  collections: ["hls-l30"]
});
