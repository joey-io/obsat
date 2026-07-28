export const water = {
  id: "usgs-water",
  name: "USGS Water Sites",
  kind: "ground-sensor",
  provider: "USGS",
  collections: ["water-sites", "instantaneous-values"],

  async observe({ lat, lon, radiusKm = 25, limit = 20 }, context = {}) {
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const delta = Math.max(0.01, radiusKm / 111);
    const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].join(",");
    const siteUrl = new URL("https://waterservices.usgs.gov/nwis/site/");
    siteUrl.searchParams.set("format", "rdb");
    siteUrl.searchParams.set("bBox", bbox);
    siteUrl.searchParams.set("siteStatus", "active");
    siteUrl.searchParams.set("hasDataTypeCd", "iv");
    siteUrl.searchParams.set("siteOutput", "basic");

    const siteResponse = await fetchImpl(siteUrl);
    if (!siteResponse.ok) throw new Error(`usgs-water site request failed: ${siteResponse.status}`);
    const rows = parseRdb(await siteResponse.text()).slice(0, limit);
    if (!rows.length) return [];

    const siteIds = rows.map((row) => row.site_no).filter(Boolean);
    const valuesUrl = new URL("https://waterservices.usgs.gov/nwis/iv/");
    valuesUrl.searchParams.set("format", "json");
    valuesUrl.searchParams.set("sites", siteIds.join(","));
    valuesUrl.searchParams.set("siteStatus", "all");

    let series = [];
    const valuesResponse = await fetchImpl(valuesUrl);
    if (valuesResponse.ok) {
      const values = await valuesResponse.json();
      series = values?.value?.timeSeries ?? [];
    }

    return rows.map((row) => ({
      id: `usgs-water:${row.site_no}`,
      adapter: "usgs-water",
      kind: "water-station",
      observedAt: new Date().toISOString(),
      geometry: {
        type: "Point",
        coordinates: [Number(row.dec_long_va), Number(row.dec_lat_va)]
      },
      properties: {
        siteNumber: row.site_no,
        stationName: row.station_nm,
        siteType: row.site_tp_cd,
        altitude: row.alt_va || null,
        timeSeries: series.filter((item) => item?.sourceInfo?.siteCode?.some((code) => code.value === row.site_no))
      },
      source: `https://waterdata.usgs.gov/monitoring-location/${row.site_no}/`,
      raw: row
    }));
  }
};

function parseRdb(text) {
  const lines = text.split(/\r?\n/).filter((line) => line && !line.startsWith("#"));
  if (lines.length < 3) return [];
  const headers = lines[0].split("\t");
  return lines.slice(2).map((line) => {
    const values = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}
