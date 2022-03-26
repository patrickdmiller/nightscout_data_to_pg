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

main.dump = async ({ format = "json" } = {}) => {
  return pg.dump().then((data) => {
    let s = parseInt(data.entries[0].date);
    const spacing = 300000;
    let i = 0;
    const d = [];
    let last = null;
    while (i < data.entries.length){
      while(parseInt(data.entries[i].date) < s){
        i++
        if(i >=data.entries.length ){
          break;
        }
      }
      if(i >=data.entries.length){
        d.push({ sgv: data.entries[i - 1].sgv, date: s, carbs: 0, insulin: 0 });
        break;
      }
      if(parseInt(data.entries[i].date) == s || i==0){
        d.push({ sgv: data.entries[i].sgv, date: s, carbs: 0, insulin: 0 });
      }else{
        //what is closer?
        let left = Math.abs(parseInt(data.entries[i - 1].date) - s);
        let right = Math.abs(parseInt(data.entries[i].date) - s);
        let lr = left + right;
        let v = ((lr - left) / lr) * data.entries[i - 1].sgv + ((lr - right) / lr) * data.entries[i].sgv;
        d.push({ sgv: v, date: s, carbs: 0, insulin: 0 });
      }


      s+=spacing
    }
    /*
    while (i < data.entries.length) {
      last = [data.entries[i], s];
      if (parseInt(data.entries[i].date) == s) {
        d.push({ sgv: data.entries[i].sgv, date: s, carbs: 0, insulin: 0 });
        s += spacing;
        i++;
        // continue
      } else {
        //figure out which is closer and take a weighted midpoint
        //loop over i until its >
        while (true && i < data.entries.length) {
          if (parseInt(data.entries[i].date) == s) {
            d.push({ sgv: data.entries[i].sgv, date: s, carbs: 0, insulin: 0 });
            i++;
            s += spacing;
            break;
          }

          if (parseInt(data.entries[i].date) > s) {
            //in between i-1 and i
            let left = Math.abs(parseInt(data.entries[i - 1].date) - s);
            let right = Math.abs(parseInt(data.entries[i].date) - s);
            let lr = left + right;
            //the formula is ((lr - distance(left) / lr) * left_value) +
            let v = ((lr - left) / lr) * data.entries[i - 1].sgv + ((lr - right) / lr) * data.entries[i].sgv;
            d.push({ sgv: v, date: s, carbs: 0, insulin: 0 });
            i++;
            s += spacing;
            break;
          } else {
            i++;
            if (i >= data.entries.length) {
              d.push({ sgv: data.entries[i - 1].sgv, date: s, carbs: 0, insulin: 0 });
            }
          }
        }
      }
      // s += spacing;
    }*/
    for(let i =1; i < d.length; i++){
      if(d[i].date - d[i-1].date > spacing){
        logger.error("????")
      }
    }
    logger.error(d.length, "start:", d[0].date, "end:", d[d.length-1].date)
    // return {d}
    let ts = data.treatments;
    let j = 0;
    let uu =0
    function u({ index, carbs=0, insulin=0, sgv } = {}) {
      if (sgv) {
        if (Math.abs(d[index].sgv - sgv) > 20) {
          // console.log("error. sgv diff", sgv, d[index].sgv, d[index].date ,+uu);
        }
      }
      d[index].carbs = carbs || 0;
      d[index].insulin = insulin || 0;
    }

    for (let i = 0; i < ts.length; i++) {
      let tsd = parseInt(ts[i].date);
      // console.log(tsd)1647870840000
      while (d[j].date < tsd) {
        j++;
      }
      if (j > 0) {
        //which one is closer?
        let which = j;
        if (tsd - d[j - 1].date < d[j].date - tsd) {
          which = j - 1;
        }
        u({ index: which, carbs: ts[i].carbs, insulin: ts[i].insulin, sgv: ts[i].glucose });
      } else {
        u({ index: j, carbs: ts[i].carbs, insulin: ts[i].insulin, sgv: ts[i].glucose });
      }
    }

    for(let i =0; i < d.length; i++){
      let date = new Date(d[i].date)
      let m = (date.getHours()*60) + date.getMinutes()
      d[i].ts = m
    }
    if (format == "json") return { d };
    if (format == "csv") {
      let r = "date,sgv,carbs,insulin\n";
      for(let i =0; i < d.length; i++){
        r+=`${d[i].date},${d[i].sgv},${d[i].carbs},${d[i].insulin}\n`
      }
      return r
    }
  });
};

main.end = async () => {
  return pg.end().then(() => ns.close());
};
module.exports = main;
