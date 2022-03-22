const m = require("./src/main");
const logger = require("node-color-log");
const main = require("./src/main");

m.init()
  .then(() => {
    logger.info("pg and ns are ready");
  })
  .then(() => m.load({ all: false })) //if not all, then only new entries are queried. if all, updated entries when duplicates found.
  .then(() => {
    logger.info("done!");
  })
  .then(() => main.end())
  .then(() => logger.info("closed"))
  .catch((e) => {
    logger.error(e);
  });
