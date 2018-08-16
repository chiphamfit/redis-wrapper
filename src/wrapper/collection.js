const Collection = require('mongodb/lib/collection');

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