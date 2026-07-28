import { Obsat } from "./obsat.js";
import { landsat } from "./adapters/landsat.js";
import { sentinel1 } from "./adapters/sentinel1.js";
import { sentinel1Rtc } from "./adapters/sentinel1rtc.js";
import { sentinel2 } from "./adapters/sentinel2.js";
import { hlsLandsat } from "./adapters/hlsLandsat.js";
import { hlsSentinel } from "./adapters/hlsSentinel.js";

export { Obsat } from "./obsat.js";
export { AdapterRegistry } from "./registry.js";
export { createStacAdapter } from "./adapters/stac.js";
export { landsat } from "./adapters/landsat.js";
export { sentinel1 } from "./adapters/sentinel1.js";
export { sentinel1Rtc } from "./adapters/sentinel1rtc.js";
export { sentinel2 } from "./adapters/sentinel2.js";
export { hlsLandsat } from "./adapters/hlsLandsat.js";
export { hlsSentinel } from "./adapters/hlsSentinel.js";

export const adapters = [
  sentinel1,
  sentinel1Rtc,
  sentinel2,
  landsat,
  hlsLandsat,
  hlsSentinel
];

export const obsat = new Obsat({ adapters });
