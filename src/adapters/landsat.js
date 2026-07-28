import { createStacAdapter } from "./stac.js";

export const landsat = createStacAdapter({
  id: "landsat",
  name: "USGS Landsat 8/9",
  satellite: "Landsat 8/9",
  endpoint: "https://landsatlook.usgs.gov/stac-server/search",
  collections: ["landsat-c2l2-sr"]
});
