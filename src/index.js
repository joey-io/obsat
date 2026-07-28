import { Obsat } from "./obsat.js";
import { landsat } from "./adapters/landsat.js";
import { sentinel1 } from "./adapters/sentinel1.js";
import { sentinel1Rtc } from "./adapters/sentinel1rtc.js";
import { sentinel2 } from "./adapters/sentinel2.js";
import { hlsLandsat } from "./adapters/hlsLandsat.js";
import { hlsSentinel } from "./adapters/hlsSentinel.js";
import { earthquakes } from "./adapters/earthquakes.js";
import { elevation } from "./adapters/elevation.js";
import { weather } from "./adapters/weather.js";
import { openMeteo } from "./adapters/openMeteo.js";
import { openMeteoAir } from "./adapters/openMeteoAir.js";
import { openStreetMap } from "./adapters/openStreetMap.js";
import { water } from "./adapters/water.js";
import { airNow } from "./adapters/airnow.js";

export { Obsat } from "./obsat.js";
export { AdapterRegistry } from "./registry.js";
export { createStacAdapter } from "./adapters/stac.js";
export { landsat } from "./adapters/landsat.js";
export { sentinel1 } from "./adapters/sentinel1.js";
export { sentinel1Rtc } from "./adapters/sentinel1rtc.js";
export { sentinel2 } from "./adapters/sentinel2.js";
export { hlsLandsat } from "./adapters/hlsLandsat.js";
export { hlsSentinel } from "./adapters/hlsSentinel.js";
export { earthquakes } from "./adapters/earthquakes.js";
export { elevation } from "./adapters/elevation.js";
export { weather } from "./adapters/weather.js";
export { openMeteo } from "./adapters/openMeteo.js";
export { openMeteoAir } from "./adapters/openMeteoAir.js";
export { openStreetMap } from "./adapters/openStreetMap.js";
export { water } from "./adapters/water.js";
export { airNow } from "./adapters/airnow.js";

export const adapters = [
  sentinel1,
  sentinel1Rtc,
  sentinel2,
  landsat,
  hlsLandsat,
  hlsSentinel,
  earthquakes,
  elevation,
  openMeteo,
  openMeteoAir,
  openStreetMap,
  weather,
  water,
  airNow
];

export const obsat = new Obsat({ adapters });