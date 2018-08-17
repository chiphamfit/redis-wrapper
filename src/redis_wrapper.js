const promisify = require('util').promisify;

// Constants
const NO_COUNT = -1;
const NO_EXPIRE = -1;
const NO_MATCH = '';
const FIRST_CURSOR = '0';
const NEXT_CURSOR_INDEX = 0;
const DATA_INDEX = 1;
const HASH = 'hash';
const SET = 'set';
const ZSET = 'zset';
const STRING = 'string';

class RedisWrapper {
  constructor(client) {
    client.on('error', (error) => {
      if (error) {
        throw error;
      }
    });

    this.client = client;
  }

  async search(key, type = STRING, count = NO_COUNT, match = NO_MATCH) {
    if ('string' !== typeof key) {
      throw new TypeError('key name must be a String');
    }

    if (key.length === 0) {
      throw new TypeError('key names cannot be empty');
    }

    match = match instanceof String ? match : NO_MATCH;
    count = count > 0 ? count : NO_COUNT;

    let result = [];
    let command = null;
    let query = [key, FIRST_CURSOR];
    let nextCursor = FIRST_CURSOR;
    const redis = this.client;

    if (count !== NO_COUNT) {
      query = query.concat('COUNT', count);
    }

    if (match !== NO_MATCH) {
      query = query.concat('MATCH', match);
    }

    switch (type) {
    case HASH:
      command = promisify(redis.hscan).bind(redis);
      break;
    case SET:
      command = promisify(redis.sscan).bind(redis);
      break;
    case ZSET:
      command = promisify(redis.zscan).bind(redis);
      break;
    case STRING:
      command = promisify(redis.get).bind(redis);
      return await command(key);
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
        // result = result.concat(data);
      }
    } while (nextCursor !== FIRST_CURSOR && (result.length < count || count === NO_COUNT));

    return result;
  }

  async save(key = '', data = {}, type = STRING, expire = NO_EXPIRE) {
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
    if (expire !== NO_EXPIRE) {
      redis.expire(key, expire);
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