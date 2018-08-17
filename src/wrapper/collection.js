const Collection = require('mongodb').Collection;

class CollectionWrapper extends Collection {
  constructor({
    db,
    topology,
    dbName,
    name,
    pkFactory,
    options,
    redis,
    expire
  }) {
    super(db, topology, dbName, name, pkFactory, options);
    this.redisWrapper = redis;
    this.expire = expire;
  }
}
module.exports = CollectionWrapper;