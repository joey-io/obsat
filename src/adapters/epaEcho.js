// EPA ECHO lists facilities regulated under the Clean Air Act, Clean Water
// Act, and RCRA, along with their inspection and enforcement history. It turns
// "what is around me" into "what around me is permitted to emit, and whether
// it is in compliance".
// ECHO column IDs, in the order documented by echo_rest_services.metadata:
// 1 FacName, 2 FacStreet, 3 FacCity, 4 FacState, 5 FacZip, 6 RegistryID,
// 7 FacCounty, 15 FacSICCodes, 16 FacNAICSCodes, 17 FacLat, 18 FacLong,
// 34 FacSNCFlg, 35 FacQtrsWithNC, 36 FacComplianceStatus,
// 41 FacInspectionCount, 43 FacDateLastInspection, 55 FacDateLastFormalAction,
// 61 FacPenaltyCount, 62 FacDateLastPenalty.
const ECHO_COLUMNS = "1,2,3,4,5,6,7,15,16,17,18,34,35,36,41,43,55,61,62";

export const epaEcho = {
  id: "epa-echo",
  name: "EPA ECHO Regulated Facilities",
  kind: "regulatory",
  provider: "US Environmental Protection Agency",
  collections: ["facilities", "compliance"],
  attribution: "US EPA Enforcement and Compliance History Online",

  async observe({ lat, lon, radiusKm = 5, limit = 20 }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;

    // ECHO is a two-step API: the search returns a QueryID, and the rows are
    // fetched separately with get_qid. There is no single-call form.
    const searchUrl = new URL("https://echodata.epa.gov/echo/echo_rest_services.get_facilities");
    searchUrl.searchParams.set("output", "JSON");
    searchUrl.searchParams.set("p_lat", String(lat));
    searchUrl.searchParams.set("p_long", String(lon));
    // The parameter is p_radius, in miles. p_rad is rejected with
    // "p_radius required when using p_lat and p_long".
    searchUrl.searchParams.set("p_radius", String(toMiles(radiusKm)));

    const searchResponse = await fetchImpl(searchUrl);
    if (!searchResponse.ok) throw new Error(`epa-echo search failed: ${searchResponse.status}`);
    const search = await searchResponse.json();

    const error = search?.Results?.Error?.ErrorMessage;
    if (error) throw new Error(`epa-echo search failed: ${error}`);

    const queryId = search?.Results?.QueryID;
    if (!queryId || search?.Results?.QueryRows === "0") return [];

    const rowsUrl = new URL("https://echodata.epa.gov/echo/echo_rest_services.get_qid");
    rowsUrl.searchParams.set("qid", String(queryId));
    rowsUrl.searchParams.set("output", "JSON");
    rowsUrl.searchParams.set("pageno", "1");
    // The default column set includes FacLat but omits FacLong, which left
    // every facility without a usable position. Request columns explicitly by
    // ID (see echo_rest_services.metadata) so the response always carries the
    // fields mapped below.
    rowsUrl.searchParams.set("qcolumns", ECHO_COLUMNS);

    const rowsResponse = await fetchImpl(rowsUrl);
    if (!rowsResponse.ok) throw new Error(`epa-echo rows failed: ${rowsResponse.status}`);
    const rows = await rowsResponse.json();

    // ECHO returns a page ordered by facility name, so a small `limit` would
    // otherwise hand back whatever sorts first alphabetically rather than what
    // is actually nearby. Sort the page by distance before truncating.
    const facilities = [...(rows?.Results?.Facilities ?? [])]
      .sort((a, b) => squaredDistance(a, lat, lon) - squaredDistance(b, lat, lon));

    return facilities.slice(0, limit).map((facility) => ({
      id: `epa-echo:${facility.RegistryID}`,
      adapter: "epa-echo",
      kind: "regulated-facility",
      observedAt: null,
      geometry: toPoint(facility, lat, lon),
      properties: {
        name: facility.FacName ?? null,
        street: facility.FacStreet ?? null,
        city: facility.FacCity ?? null,
        state: facility.FacState ?? null,
        zip: facility.FacZip ?? null,
        county: facility.FacCounty ?? null,
        registryId: facility.RegistryID ?? null,
        naicsCodes: facility.FacNAICSCodes ?? null,
        sicCodes: facility.FacSICCodes ?? null,
        complianceStatus: facility.FacComplianceStatus ?? null,
        // "Significant non-compliance" flag; Y is the one worth surfacing.
        significantNonCompliance: facility.FacSNCFlg ?? null,
        quartersInNonCompliance: toNumber(facility.FacQtrsWithNC),
        inspectionCount: toNumber(facility.FacInspectionCount),
        lastInspection: facility.FacDateLastInspection ?? null,
        lastFormalAction: facility.FacDateLastFormalAction ?? null,
        penaltyCount: toNumber(facility.FacPenaltyCount),
        lastPenalty: facility.FacDateLastPenalty ?? null
      },
      source: facility.RegistryID
        ? `https://echo.epa.gov/detailed-facility-report?fid=${facility.RegistryID}`
        : "https://echo.epa.gov/",
      raw: facility
    }));
  }
};

function toMiles(radiusKm) {
  // ECHO caps the search radius at 100 miles and rejects 0.
  const miles = radiusKm * 0.621371;
  return Math.max(1, Math.min(100, Math.round(miles * 100) / 100));
}

// Ranking only, so there is no need for a great-circle distance. Longitude is
// scaled by cos(latitude) to keep the comparison honest away from the equator.
function squaredDistance(facility, lat, lon) {
  const facilityLat = toNumber(facility.FacLat);
  const facilityLon = toNumber(facility.FacLong);
  if (facilityLat === null || facilityLon === null) return Number.POSITIVE_INFINITY;
  const dLat = facilityLat - lat;
  const dLon = (facilityLon - lon) * Math.cos((lat * Math.PI) / 180);
  return dLat * dLat + dLon * dLon;
}

function toPoint(facility, lat, lon) {
  const facilityLat = toNumber(facility.FacLat);
  const facilityLon = toNumber(facility.FacLong);
  if (facilityLat === null || facilityLon === null) {
    return { type: "Point", coordinates: [lon, lat] };
  }
  return { type: "Point", coordinates: [facilityLon, facilityLat] };
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
