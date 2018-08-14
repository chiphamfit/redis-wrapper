class CollectionWrapper {
  constructor(collection, redis) {
    this.collection = collection;
    this.redis = redis;
  }
}

module.exports = CollectionWrapper;