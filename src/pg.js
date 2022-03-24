const logger = require("node-color-log");
const { Pool, Client } = require("pg");
require("dotenv").config();
let pool;
const TRENDS = {
  'DoubleUp':1,
  'SingleUp':2,
  'FortyFiveUp':3,
  'Flat':4,
  'FortyFiveDown':5,
  'SingleDown':6,
  'DoubleDown':7,
  'NOT COMPUTABLE':8
}

module.exports = {

  init: async ({ withTableCreation = true } = {}) => {
    //connect to the database
    pool = await new Pool();
    logger.info("pg connected")
    if (withTableCreation) {
      logger.info("pg creating tables if not exists")
      await pool.query(
        `CREATE TABLE IF NOT EXISTS entries(
          _id varchar(32) NOT NULL,
          date bigint NOT NULL,
          sgv int NOT NULL,
          trend int NOT NULL,
          direction varchar(20) NOT NULL,
          device varchar(20) NOT NULL,
          type varchar(20) NOT NULL,
          PRIMARY KEY (_id))`
      );
      await pool.query(`CREATE INDEX IF NOT EXISTS _id_idx ON entries(_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS date_idx ON entries(date)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS sgv_idx ON entries(sgv)`);

      await pool.query(
        `CREATE TABLE IF NOT EXISTS treatments(
          _id varchar(32) NOT NULL,
          eventType varchar(50) NOT NULL,
          date bigint NOT NULL,
          dateString varchar(50) NOT NULL,
          glucose int,
          insulin float,
          carbs float,
          units varchar(20),
          PRIMARY KEY (_id))`
      );
      await pool.query(`CREATE INDEX IF NOT EXISTS _id_t_idx ON treatments(_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS date_t_idx ON treatments(date)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS carbs_t_idx ON treatments(carbs)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS insulin_t_idx ON treatments(insulin)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS glucose_t_idx ON treatments(glucose)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS eventType_t_idx ON treatments(eventType)`);
    }
    //return the pool
    logger.info("pg ready")
  },
  end:()=>{return pool.end()},
  insertEntry: async ({ _id, sgv, date, trend, direction, device, type }) => {
    //insert a new entry
    if(isNaN(trend)){
      direction = trend;
      trend = TRENDS[direction]
    }
    await pool.query(
      `INSERT INTO entries(_id, sgv, date, trend, direction, device, type) VALUES($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (_id) 
      DO UPDATE SET(sgv, date, trend, direction, device, type) = (EXCLUDED.sgv, EXCLUDED.date, EXCLUDED.trend, EXCLUDED.direction, EXCLUDED.device, EXCLUDED.type)`,
      [_id, sgv, date, trend, direction, device, type]
    );

  },
  getLatest: async ({ table = "entries" }) => {
    let res = await pool.query(`SELECT * FROM ${table} ORDER BY date DESC LIMIT 1`);
    return res.rows;
  },
  insertTreatment: async ({ _id, eventType=null, created_at, glucose=null, insulin=null, carbs=null, units=null }) => {
    
    let dateString = created_at
    let date = new Date(dateString).getTime();
    if(eventType === null || eventType == ''){
      logger.warn("unknown event type: ", _id, eventType, date, dateString, glucose, insulin, carbs, units)
    }
    await pool.query(
      `INSERT INTO treatments(_id, eventType, date, dateString, glucose, insulin, carbs, units) VALUES($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (_id) 
      DO UPDATE SET(eventType, date, dateString, glucose, insulin, carbs, units) = (EXCLUDED.eventType, EXCLUDED.date, EXCLUDED.dateString, EXCLUDED.glucose, EXCLUDED.insulin, EXCLUDED.carbs, EXCLUDED.units)`,
      [_id, eventType, date, dateString, glucose, insulin, carbs, units]
    );
  },
  dump: async()=>{
    const res = {}
    res.entries = await pool.query(`SELECT * FROM entries ORDER BY date ASC`)
    res.entries = res.entries.rows
    res.treatments = await pool.query(`SELECT * FROM treatments ORDER BY date ASC`)
    res.treatments = res.treatments.rows
    return res
  }
};
