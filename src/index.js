import { Obsat } from "./obsat.js";
import { landsat } from "./adapters/landsat.js";
import { sentinel1 } from "./adapters/sentinel1.js";
import { sentinel1Rtc } from "./adapters/sentinel1rtc.js";
import { sentinel2 } from "./adapters/sentinel2.js";
import { hlsLandsat } from "./adapters/hlsLandsat.js";
import { hlsSentinel } from "./adapters/hlsSentinel.js";
import { nasaFirms } from "./adapters/nasaFirms.js";
import { earthquakes } from "./adapters/earthquakes.js";
import { elevation } from "./adapters/elevation.js";
import { openMeteoElevation } from "./adapters/openMeteoElevation.js";
import { weather } from "./adapters/weather.js";
import { openMeteo } from "./adapters/openMeteo.js";
import { openMeteoAir } from "./adapters/openMeteoAir.js";
import { openMeteoFlood } from "./adapters/openMeteoFlood.js";
import { nasaPower } from "./adapters/nasaPower.js";
import { openStreetMap } from "./adapters/openStreetMap.js";
import { nominatim } from "./adapters/nominatim.js";
import { wikipedia } from "./adapters/wikipedia.js";
import { gbif } from "./adapters/gbif.js";
import { census } from "./adapters/census.js";
import { epaEcho } from "./adapters/epaEcho.js";
import { water } from "./adapters/water.js";
import { airNow } from "./adapters/airnow.js";
import { openAq } from "./adapters/openAq.js";

export { Obsat } from "./obsat.js";
export { AdapterRegistry } from "./registry.js";
export { OBSAT_VERSION, USER_AGENT } from "./version.js";
export { createStacAdapter } from "./adapters/stac.js";
export { landsat } from "./adapters/landsat.js";
export { sentinel1 } from "./adapters/sentinel1.js";
export { sentinel1Rtc } from "./adapters/sentinel1rtc.js";
export { sentinel2 } from "./adapters/sentinel2.js";
export { hlsLandsat } from "./adapters/hlsLandsat.js";
export { hlsSentinel } from "./adapters/hlsSentinel.js";
export { nasaFirms } from "./adapters/nasaFirms.js";
export { earthquakes } from "./adapters/earthquakes.js";
export { elevation } from "./adapters/elevation.js";
export { openMeteoElevation } from "./adapters/openMeteoElevation.js";
export { weather } from "./adapters/weather.js";
export { openMeteo } from "./adapters/openMeteo.js";
export { openMeteoAir } from "./adapters/openMeteoAir.js";
export { openMeteoFlood } from "./adapters/openMeteoFlood.js";
export { nasaPower } from "./adapters/nasaPower.js";
export { openStreetMap } from "./adapters/openStreetMap.js";
export { nominatim } from "./adapters/nominatim.js";
export { wikipedia } from "./adapters/wikipedia.js";
export { gbif } from "./adapters/gbif.js";
export { census } from "./adapters/census.js";
export { epaEcho } from "./adapters/epaEcho.js";
export { water } from "./adapters/water.js";
export { airNow } from "./adapters/airnow.js";
export { openAq } from "./adapters/openAq.js";

// Ordered the way a reader wants them: the identity of the place first, then
// imagery, terrain, atmosphere, water, life, and finally the regulatory and
// reference record.
export const adapters = [
  nominatim,
  census,
  sentinel1,
  sentinel1Rtc,
  sentinel2,
  landsat,
  hlsLandsat,
  hlsSentinel,
  nasaFirms,
  earthquakes,
  elevation,
  openMeteoElevation,
  openMeteo,
  openMeteoAir,
  nasaPower,
  weather,
  water,
  openMeteoFlood,
  gbif,
  openStreetMap,
  wikipedia,
  epaEcho,
  airNow,
  openAq
];

export const obsat = new Obsat({ adapters });
