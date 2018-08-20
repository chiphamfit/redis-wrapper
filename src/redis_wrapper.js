const promisify = require('util').promisify;
const RedisClient = require('redis').createClient;

// Constants
const NO_COUNT = -1;
const NO_EXPIRE = -1;
const NO_MATCH = '*';
const FIRST_CURSOR = '0';
const NEXT_CURSOR_INDEX = 0;
const DATA_INDEX = 1;
const HASH = 'hash';
const SET = 'set';
const ZSET = 'zset';
const STRING = 'string';

class RedisWrapper {
  /**
   * Create a Redis Wrapper client
   * @param {RedisClient} client 
   * @param {Number} expire 
   */
  constructor(client = {}, expire = NO_EXPIRE) {
    if (client instanceof RedisClient) {
      this.client = client;
    } else {
      this.client = RedisClient();
    }

    this.client.on('error', (error) => {
      if (error) {
        throw error;
      }
    });

    if (isNaN(expire) || expire < NO_EXPIRE) {
      throw new TypeError('expire must be a positive Number');
    }

    this.expire = expire;
  }

  /**
   * Search value in redis by key
   * @param {String} key 
   * @param {String} type 
   * @param {Number} count 
   * @param {Number} match 
   */
  async search(key = '*', type = STRING, count = NO_COUNT, match = NO_MATCH) {
    if (typeof key !== STRING) {
      throw new TypeError('key name must be a String');
    }

    // create scan's query, command
    let result = [];
    let command = null;
    let query = [key, FIRST_CURSOR];
    let nextCursor = FIRST_CURSOR;
    const redis = this.client;
    const _type = type.toLocaleLowerCase();
    const _match = match instanceof String ? match : NO_MATCH;
    const _count = count > 0 ? count : NO_COUNT;

    if (_match !== NO_MATCH) {
      query = [...query, 'MATCH', match];
    }

    if (_count !== NO_COUNT) {
      query = [...query, 'COUNT', count];
    }

    if (_type === STRING) {
      command = promisify(redis.get).bind(redis);
      return await command(key);
    }

    switch (_type) {
    case HASH:
      command = promisify(redis.hscan).bind(redis);
      break;
    case SET:
      command = promisify(redis.sscan).bind(redis);
      break;
    case ZSET:
      command = promisify(redis.zscan).bind(redis);
      break;
    default:
      throw new Error('type is not supported');
    }

    do {
      const scanResult = await command(query);
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
  async save(key = '', data = {}, type = STRING) {
    let command, parameters;
    const redis = this.client;

    // data should be a JSON
    if (type === HASH) {
      parameters = [];
      for (let field in data) {
        command = promisify(redis.hset).bind(redis);
        parameters.push(key, field, data[field]);
      }
    }

    // data should be a JSON
    if (type === ZSET) {
      command = promisify(redis.zadd).bind(redis);
      parameters = [key];

      for (let field in data) {
        const score = data[field];
        const member = field;
        parameters.push(score, member);
      }
    }

    // data should be an array of members
    if (type === SET) {
      command = promisify(redis.sadd).bind(redis);
      parameters = [key, ...data];
    }

    // data can be anythings
    if (type === STRING) {
      command = promisify(redis.set).bind(redis);
      parameters = [key, JSON.stringify(data)];
    }

    // Execute the command
    await command(parameters);

    // Set expire time for cache
    if (this.expire !== NO_EXPIRE) {
      redis.expire(key, this.expire);
    }
  }

  delete(key) {
    this.client.delete(key);
  }

  clearCache() {
    return this.client.flushdb();
  }
}

module.exports = {
  RedisWrapper,
  NO_EXPIRE,
};