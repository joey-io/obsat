import { createStacAdapter } from "./stac.js";

export const sentinel1 = createStacAdapter({
  id: "sentinel-1",
  name: "Copernicus Sentinel-1 GRD",
  satellite: "Sentinel-1",
  endpoint: "https://planetarycomputer.microsoft.com/api/stac/v1/search",
  collections: ["sentinel-1-grd"]
});
