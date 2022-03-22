//connect to nightscout database directly
const { MongoClient } = require("mongodb");
require("dotenv").config();
const logger = require("node-color-log");

let ns_mongo = {
  host: process.env.NSHOST,
  port: process.env.NSPORT,
  db: process.env.NSDB,
  user: process.env.NSUSER,
  pass: process.env.NSPASSWORD,
  connecturl: "",
  url: function () {
    return `mongodb://${this.user}:${this.pass}@${this.host}:${this.port}/${this.db}`;
  },
};

let client;
let db;
//build connection string

module.exports = {
  init: (props = {}) => {
    for (let key in props) {
      ns_mongo[key] = props[key];
    }
    client = new MongoClient(ns_mongo.url());
    return client.connect().then(() => {
      logger.info("ns connected and ready");
      db = client.db("Nightscout");
    });
  },
  close: ()=>{
    return client.close()
  },

  fetchAll: ({ collection = "entries" }) => {
    if (!client) {
      throw new Error("client not initialized");
    } else {
      let coll = db.collection(collection);
      return coll.find().toArray();
    }
  },
  fetchAllEntries: () => {
    return this.fetchAll({ collection: "entries" });
  },

  fetchEntriesFrom: ({ collection = "entries", after = -1, limit = null }) => {
    logger.info("fetching after", after);
    if (!client) {
      throw new Error("client not initialized");
    } else {
      if (limit !== null) {
        return db
          .collection(collection)
          .find({ date: { $gt: parseInt(after) } })
          .limit(limit)
          .toArray();
      } else {
        return db
          .collection(collection)
          .find({ date: { $gt: parseInt(after) } })
          .toArray();
      }
    }
  },

  fetchAllTreatments: () => {
    return this.fetchAll({ collection: "treatments" });
  },

  fetchTreatmentsFrom: ({ collection = "treatments", after = "1980-01-01T00:00:00.000Z" }) => {
    logger.info("fetching after", after);
    if (!client) {
      throw new Error("client not initialized");
    } else {
      return db
        .collection(collection)
        .find({ $expr: { $gte: [{ $dateFromString: { dateString: "$created_at" } }, new Date(after)] } })
        .toArray();
    }
  },
};
