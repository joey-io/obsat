import { createStacAdapter } from "./stac.js";

export const sentinel1Rtc = createStacAdapter({
  id: "sentinel-1-rtc",
  name: "Copernicus Sentinel-1 RTC",
  satellite: "Sentinel-1",
  endpoint: "https://planetarycomputer.microsoft.com/api/stac/v1/search",
  collections: ["sentinel-1-rtc"]
});
