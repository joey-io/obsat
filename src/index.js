import { Obsat } from "./obsat.js";
import { landsat } from "./adapters/landsat.js";
import { sentinel2 } from "./adapters/sentinel2.js";

export { Obsat } from "./obsat.js";
export { AdapterRegistry } from "./registry.js";
export { createStacAdapter } from "./adapters/stac.js";
export { landsat } from "./adapters/landsat.js";
export { sentinel2 } from "./adapters/sentinel2.js";

export const obsat = new Obsat({ adapters: [landsat, sentinel2] });
