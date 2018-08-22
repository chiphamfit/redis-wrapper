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

class RedisWrapper {
  /**
   * Create a Redis Wrapper client
   * @param {RedisClient} client 
   * @param {Number} expire 
   */
  constructor(client, expire) {
    // create client
    this.client = client instanceof redis.RedisClient ? client : redis.createClient();
    this.client.on('error', (error) => {
      if (error) {
        throw error;
      }
    });

    // check if user bypass client
    if (typeof client === 'number' && expire === undefined) {
      expire = client || NO_EXPIRE;
    }

    if (isNaN(expire) || expire < NO_EXPIRE) {
      throw new TypeError('expire must be a positive Number');
    }

    this.expire = expire;
  }

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
   */
  async search(key, type = STRING, count = NO_COUNT, match = NO_MATCH) {
    if (typeof key !== STRING) {
      throw new TypeError('key name must be a String');
    }

    if (typeof count !== 'number' || count < NO_COUNT) {
      throw new TypeError('count must be an positive number');
    }

    // create new options
    const newKey = JSON.stringify(key);
    const newType = type.toLocaleLowerCase();
    const newMatch = JSON.stringify(match);

    // create scan's query, command
    let scan = this.client;
    let result = [];
    let query = [key, FIRST_CURSOR];
    let nextCursor = FIRST_CURSOR;

    if (newMatch !== NO_MATCH) {
      query = [...query, 'MATCH', match];
    }

    if (count !== NO_COUNT) {
      query = [...query, 'COUNT', count];
    }

    // get String
    if (newType === STRING) {
      return await this.client.getAsync(newKey);
    }

    switch (newType) {
    case HASH:
      scan = scan.hscanAsync;
      break;
    case SET:
      scan = scan.sscanAsync;
      break;
    case ZSET:
      scan = scan.zscanAsync;
      break;
    default:
      throw new Error('type is not supported');
    }

    // bind client
    scan = scan.bind(this.client);

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
    } while (nextCursor !== FIRST_CURSOR && (result.length < count || count === NO_COUNT));

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
        saveCache = this.client.hmsetAsync;
        parameters.push(field, data[field]);
      }
      break;
    case ZSET:
      saveCache = this.client.zaddAsync;
      parameters = [newKey];

      for (let field in data) {
        const score = data[field];
        const member = field;
        parameters.push(score, member);
      }
      break;
    case SET:
      saveCache = this.client.saddAsync;
      parameters = [newKey, ...data];
      break;
    case STRING:
      saveCache = this.client.setAsync;
      parameters = [newKey, JSON.stringify(data)];
      break;
    default:
      throw new Error('type not support');
    }

    // bind client
    saveCache = saveCache.bind(this.client);

    // Execute the saveCache
    try {
      await saveCache(parameters);
    } catch (error) {
      throw error;
    }

    // Set expire time for cache
    if (this.expire !== NO_EXPIRE) {
      this.client.expire(newKey, this.expire);
    }
  }

  delete(key) {
    this.client.delete(key);
  }

  clearCache() {
    return this.client.flushdb();
  }
}

module.exports = RedisWrapper;