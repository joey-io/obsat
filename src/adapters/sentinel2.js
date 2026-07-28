import { createStacAdapter } from "./stac.js";

export const sentinel2 = createStacAdapter({
  id: "sentinel-2",
  name: "Copernicus Sentinel-2",
  satellite: "Sentinel-2",
  endpoint: "https://earth-search.aws.element84.com/v1/search",
  collections: ["sentinel-2-l2a"]
});
