const ns = require("./ns");
const pg = require("./pg");
const logger = require("node-color-log");
const { Pool } = require("pg/lib");
const main = {};
main.ready = false;
main.load = async ({ all = false, dryrun = false } = {}) => {
  logger.info("loading entries");
  let latestEntry;
  let latestEntry_date = 0;
  if (!all) {
    latestEntry = await pg.getLatest({ table: "entries" });
    latestEntry_date = latestEntry.length > 0 ? latestEntry[0].date : -1;
    logger.info("entries from date", latestEntry_date);
  } else {
    logger.info("fetchign ALL");
  }
  let entries = await ns.fetchEntriesFrom({ after: latestEntry_date });
  logger.info("entries found: ", entries.length);

  let promises = [];
  if (!dryrun) {
    try {
      entries.forEach(async (entry) => {
        promises.push(pg.insertEntry(entry));
      });
      await Promise.all(promises);
    } catch (e) {
      logger.error(e);
    }
  }

  logger.info("done insertinig entries:", promises.length);

  logger.info("loading treatments");
  let latestTreatment;
  let latestTreatment_date = 0;
  if (!all) {
    latestTreatment = await pg.getLatest({ table: "treatments" });
    latestTreatment_date = latestTreatment.length > 0 ? latestTreatment[0].date : -1;
    logger.info("treatments from date", latestEntry_date);
  } else {
    logger.info("fetchign ALL");
  }
  let treatments = await ns.fetchTreatmentsFrom({ after: latestTreatment_date });
  logger.info("treatments found: ", treatments.length);
  promises = [];
  if (!dryrun) {
    try {
      treatments.forEach(async (treatment) => {
        promises.push(pg.insertTreatment(treatment));
      });
      await Promise.all(promises);
    } catch (e) {
      logger.error(e);
    }
  }

  logger.info("done insertinig", promises.length);
};

main.init = () => {
  return pg.init().then(() => ns.init());
};

main.end = async () => {
  return pg.end().then(() => ns.close());
};
module.exports = main;
