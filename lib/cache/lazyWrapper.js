const Wrapper = require('./wrapper');
const { NO_EXPIRE } = require('../ulti/constant');
const { RedisClient } = require('../ulti/helper');

class LazyWrapper extends Wrapper {
  /**
   * Creat a collection that can cache all query result in a period
   * @param {Collection} collection mongodb's collection need to lazy cache
   * @param {Cacher} cacher cacher for mongodb
   */
  constructor(collection, redis, expire) {
    // Check if redis is bypassed
    if (!isNaN(redis) && !expire) {
      expire = redis;
      redis = new RedisClient();
    }

    if (expire && isNaN(expire)) {
      throw new TypeError('expire must be a number');
    }

    // chech if expire < 0
    if (expire < 0 && expire != NO_EXPIRE) {
      throw new TypeError('expire must be a positive number');
    }

    super(collection, redis);
    this.namespace = `lazy:${this.namespace}`;
    this.ttl = expire || NO_EXPIRE;
  }

  /**
   * Clean all cache data on this collection
   */
  async flush() {
    // search all cache key of this collection and delete
    const cacheList = await this.redis.smembersAsync(this.namespace);
    cacheList.forEach(cache => {
      this.redis.del(cache);
    });

    // delete cache list
    this.redis.del(this.namespace);
  }

  /**
   * Selects documents in a collection and returns an array to the selected documents
   *
   * @param {Object} query Optional. Specifies query selection criteria using query operators.
   * @param {Object} option Optional. Specifies the fields to return using projection operators. Omit this parameter to return all fields in the matching document.
   * @returns {Promise} Return a Promise of a document array
   */
  async find(query = {}, option = {}) {
    // create query_id for search/save
    const query_id = `find:${JSON.stringify(query)}:${JSON.stringify(option)}`;

    // scan in cache fisrt
    const cached = await this.redis.getAsync(query_id);
    // if cache hit return docs
    if (cached) {
      const documents = JSON.parse(cached);
      return documents;
    }

    // if cache miss, try to find in mongodb
    const cursor = await this.collection.find(query, option);
    const documents = await cursor.toArray();

    // if have result save cache
    if (documents.length > 0) {
      // Create cache for query
      this.redis.hsetAsync(this.namespace, query_id, JSON.stringify(documents));

      // Set time to live for cache
      if (this.ttl > 0) {
        this.redis.expire(this.namespace, this.ttl);
      }
    }

    return documents;
  }

  /**
   * Returns one document that satisfies the specified query criteria.
   * If multiple documents satisfy the query, this method returns the first document
   * according to the natural order which reflects the order of documents on the disk.
   * In capped collections, natural order is the same as insertion order.
   * If no document satisfies the query, the method returns null.
   *
   * @param {Object} query Optional. Specifies query selection criteria using query operators.
   * @param {Object} option Optional. Specifies the fields to return using projection operators. Omit this parameter to return all fields in the matching document.
   * @returns {Promise} Return a Promise of a document or null
   */
  async findOne(query = {}, option = {}) {
    // create query_id for search/save
    const query_args = `${JSON.stringify(query)}:${JSON.stringify(option)}`;
    const query_id = `${this.namespace}:findOne:${query_args}`;

    // search in cache
    let document = await this.redis.getAsync(query_id);

    // if cache hit return result
    if (document) {
      return JSON.parse(document);
    }

    // cache miss, search in mongodb
    document = await this.collection.findOne(query, option);

    // if have result save cache
    if (document) {
      // save query
      this.redis.set(query_id, JSON.stringify(document));
      // update cache list
      this.redis.sadd(this.namespace, query_id);
    }

    // Update time to live for cache
    if (this.ttl > 0) {
      this.redis.expire(query_id, this.ttl);
      this.redis.expire(this.namespace, this.ttl);
    }

    return document || null;
  }
}

module.exports = LazyWrapper;
