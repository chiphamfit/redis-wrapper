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

  async search(key, type = STRING, match = NO_MATCH, count = NO_COUNT) {
    if ('string' !== typeof key) {
      throw new TypeError('key name must be a String');
    }

    if (key.length === 0) {
      throw new TypeError('key names cannot be empty');
    }

    match = match instanceof String ? match : NO_MATCH;
    count = count > 0 ? count : NO_COUNT;

    let result = [];
    let query = [key, FIRST_CURSOR];
    let nextCursor = FIRST_CURSOR;
    let scanType = null;

    if (count !== NO_COUNT) {
      query = query.concat('COUNT', count);
    }

    if (match !== NO_MATCH) {
      query = query.concat('MATCH', match);
    }

    switch (type) {
      case HASH:
        scanType = this.client.hscan;
        break;
      case SET:
        scanType = this.client.sscan;
        break;
      case ZSET:
        scanType = this.client.zscan;
        break;
      case STRING:
        break;
      default:
        throw new Error('type is not supported');
    }

    const cacheScan = promisify(scanType).bind(this.client);
    do {
      const scanResult = await cacheScan(query);
      // update query's nextCursor
      nextCursor = scanResult[NEXT_CURSOR_INDEX];
      query[1] = nextCursor;
      // add data to result
      const data = scanResult[DATA_INDEX];
      if (data) {
        result = result.concat(data);
      }
    } while (nextCursor !== FIRST_CURSOR && (result.length < count || count === NO_COUNT));

    return result;
  }

  save({
    key = '',
    data = {},
    type = STRING,
    expire = NO_EXPIRE
  }) {
    // data should be a JSON
    if (type === HASH) {
      for (let field in data) {
        this.client.hset(key, field, data[field]);
      }
    }

    // data should be a JSON
    if (type === ZSET) {
      for (let field in data) {
        const score = data[field];
        const member = field;
        this.client.zadd(key, score, member);
      }
    }

    // data should be an array of members
    if (type === SET) {
      const set = [key].concat(data);
      this.client.sadd(set);
    }

    if (type === STRING) {
      const value = JSON.stringify(data);
      this.client.set(key, value);
    }

    // Set expire time for cache
    if (expire !== NO_EXPIRE) {
      this.client.expire(key, expire);
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