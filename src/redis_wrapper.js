const {
  RedisClient,
  createClient
} = require('redis');
const promisify = require('util').promisify;

// Constants
const NO_COUNT = -1;
const NO_EXPIRE = -1;
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
  constructor(client, expire = NO_EXPIRE) {
    if (client instanceof RedisClient) {
      this.client = client;
    } else {
      this.client = createClient();
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

    const redis = this.client;
    const _key = JSON.stringify(key);
    const _type = type.toLocaleLowerCase();
    const _match = match instanceof String ? match : NO_MATCH;
    const _count = count > 0 ? count : NO_COUNT;
    // create scan's query, command
    let result = [];
    let command = null;
    let query = [key, FIRST_CURSOR];
    let nextCursor = FIRST_CURSOR;

    if (_match !== NO_MATCH) {
      query = [...query, 'MATCH', match];
    }

    if (_count !== NO_COUNT) {
      query = [...query, 'COUNT', count];
    }

    if (_type === STRING) {
      const get = promisify(redis.get).bind(redis);
      return await get(_key);
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
    const _key = JSON.stringify(key);

    // data should be a JSON
    if (type === HASH) {
      parameters = [];
      for (let field in data) {
        command = promisify(redis.hset).bind(redis);
        parameters.push(_key, field, data[field]);
      }
    }

    // data should be a JSON
    if (type === ZSET) {
      command = promisify(redis.zadd).bind(redis);
      parameters = [_key];

      for (let field in data) {
        const score = data[field];
        const member = field;
        parameters.push(score, member);
      }
    }

    // data should be an array of members
    if (type === SET) {
      command = promisify(redis.sadd).bind(redis);
      parameters = [_key, ...data];
    }

    // data can be anythings
    if (type === STRING) {
      command = promisify(redis.set).bind(redis);
      parameters = [_key, JSON.stringify(data)];
    }

    // Execute the command
    try {
      await command(parameters);
    } catch (error) {
      throw error;
    }

    // Set expire time for cache
    if (this.expire !== NO_EXPIRE) {
      redis.expire(_key, this.expire);
    }
  }

  delete(key) {
    this.client.delete(key);
  }

  clearCache() {
    return this.client.flushdb();
  }
}

// /**
//    * 
//    * @param {Object} document 
//    */
//   async saveDocument(document) {
//     if (typeof document !== 'object') {
//       throw new TypeError('document must be a Object')
//     }

//     const key = JSON.stringify(document._id);
//     const value = JSON.stringify(document);
//     const command = promisify(this.client.set).bind(this.client);
//     return await command(key, value);
//   }

module.exports = RedisWrapper;