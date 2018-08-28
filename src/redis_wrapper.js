const redis = require('redis');
const promisifyAll = require('bluebird').promisifyAll;

// add async to all redis's funtion
promisifyAll(redis);

// Constants
const NO_COUNT = 0;
const NO_EXPIRE = 0;
const NO_MATCH = '*';

const FIRST_CURSOR = '0';
const NEXT_CURSOR_INDEX = 0;
const DATA_INDEX = 1;

const SET = 'set';
const ZSET = 'zset';
const HASH = 'hash';
const STRING = 'string';

class RedisWrapper extends redis.RedisClient {
  /**
   * Create a Redis Wrapper client
   * @param {RedisClient} client A redis client
   * @param {Number} expire Time to life of cache data
   */
  constructor(client, expire) {
    super();
    // copy client to this
    if (client instanceof redis.RedisClient) {
      for (let property in client) {
        this[property] = client[property];
      }
    }

    // check if user bypass client
    if (typeof client === 'number' && expire === undefined) {
      expire = client || NO_EXPIRE;
    }

    if (isNaN(expire) || expire < NO_EXPIRE) {
      throw new TypeError('expire must be a positive Number');
    }

    this.expire = expire;
  }

  // lazy cache's function
  async searchLazyCache(query_id) {
    let cacheData = [];
    let result = [];
    try {
      cacheData = await this.search(query_id, HASH);
    } catch (error) {
      throw error;
    }

    // if cache hit, parse result back to JSON
    if (cacheData.length > 0) {
      for (let i = 1, length = cacheData.length; i < length; i += 2) {
        result.push(JSON.parse(cacheData[i]));
      }
    }

    return result;
  }

  async saveLazyCache(query_id, result, namespace) {
    // Create query set
    await this.save(namespace, [query_id], SET);

    // create hash to store query result
    let hash = {};
    result.map(document => {
      hash[document._id] = JSON.stringify(document);
    });

    await this.save(query_id, hash, HASH, this.expire);
  }

  /**
   * Search value in redis by key
   * @param {String} key
   * @param {String} type
   * @param {Number} count
   * @param {Number} match
   * @returns {Array} Returns an array of document's id
   */
  async search(key, type = SET, count = NO_COUNT, match = NO_MATCH) {
    if (typeof key !== 'string') {
      throw new TypeError('key name must be a String');
    }

    if (typeof count !== 'number' || count < NO_COUNT) {
      throw new TypeError('count must be an positive number');
    }

    // standardize options
    type = type.toLocaleLowerCase();

    // create scan's query, command
    let scan;
    let result = [];
    let query = [key, FIRST_CURSOR];
    let nextCursor = FIRST_CURSOR;

    if (match !== NO_MATCH) {
      match = JSON.stringify(match);
      query = [...query, 'MATCH', match];
    }

    if (count !== NO_COUNT) {
      query = [...query, 'COUNT', count];
    }

    switch (type) {
    case HASH:
      scan = super.hscanAsync;
      break;
    case SET:
      scan = super.sscanAsync;
      break;
    case ZSET:
      scan = super.zscanAsync;
      break;
    default:
      throw new Error('type is not supported');
    }

    // binding
    scan = scan.bind(this);

    do {
      const scanResult = await scan(query);
      // update query's nextCursor
      nextCursor = scanResult[NEXT_CURSOR_INDEX];
      query[1] = nextCursor;
      // add data to result
      const data = scanResult[DATA_INDEX];
      if (data) {
        result = [...result, ...data];
      }
    } while (
      nextCursor !== FIRST_CURSOR &&
      (result.length < count || count === NO_COUNT)
    );

    return result;
  }

  /**
   * Save data to redis
   * @param {String} key
   * @param {Object} data
   * @param {String} type
   */
  async save(key, data, type = STRING) {
    if (!key) {
      throw new TypeError('key must be a non-empty string');
    }

    if (typeof type !== 'string') {
      throw new TypeError('type must be a string');
    }

    let saveCache = null;
    let parameters = [];
    const newKey = typeof key === 'string' ? key : JSON.stringify(key);

    switch (type) {
    case HASH:
      parameters = [newKey];
      for (let field in data) {
        saveCache = super.hmsetAsync;
        parameters.push(field, data[field]);
      }
      break;
    case ZSET:
      saveCache = super.zaddAsync;
      parameters = [newKey];

      for (let field in data) {
        const score = data[field];
        const member = field;
        parameters.push(score, member);
      }
      break;
    case SET:
      saveCache = super.saddAsync;
      parameters = [newKey, ...data];
      break;
    case STRING:
      saveCache = super.setAsync;
      parameters = [newKey, JSON.stringify(data)];
      break;
    default:
      throw new Error('type not support');
    }

    // bind client
    saveCache = saveCache.bind(this);

    // Execute the saveCache
    try {
      await saveCache(parameters);
    } catch (error) {
      throw error;
    }

    // Set expire time for cache
    if (this.expire !== NO_EXPIRE) {
      super.expire(newKey, this.expire);
    }
  }
}

module.exports = RedisWrapper;
