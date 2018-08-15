const Db = require('mongodb').Db;

class CollectionWrap extends Db.Collection {
  constructor(collection, redis) {
    this.collection = collection;
    this.redis = redis;
  }

  async deleteOne(filter, options) {
    return await this.collection.deleteOne(filter, options);
  }

  async deleteMany(filter, options) {
    return await this.collection.deleteMany(filter, options);
  }

  async drop(options) {
    return await this.collection.drop(options);
  }

  find(query, options) {
    return this.collection.find(query, options);
  }

  findOne(query, options) {
    return this.collection.findOne(query, options);
  }

  async insert(docs, options) {
    return await this.collection.insert(docs, options);
  }

  async updateOne(filter, update, options) {
    return await this.collection.updateOne(filter, update, options);
  }

  async updateMany(filter, update, options) {
    return await this.collection.updateMany(filter, update, options);
  }
}

module.exports = CollectionWrap;