const redis = require('redis');
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

class RedisWrap extends redis.createClient {
  constructor({
      expire = NO_EXPIRE,
      options
    }) {
    super(options);
    if (!isNaN(expire) || expire < 0) {
      throw new TypeError('expire time must be a positive number');
    }
    this.expire = expire;
  }
  async search({
    key = '',
    type = STRING,
    match = NO_MATCH,
    count = NO_COUNT
  }) {
    let nextCursor = FIRST_CURSOR;
    let query = [key, nextCursor];
    let result = [];

    if (count !== NO_COUNT) {
      query = query.concat('COUNT', count);
    }

    if (match !== NO_MATCH) {
      query = query.concat('MATCH', match);
    }

    let scanType = super.scan;

    switch (type) {
      case HASH:
        scanType = super.hscan;
        break;
      case SET:
        scanType = super.sscan;
        break;
      case ZSET:
        scanType = super.zscan;
        break;
      default:
        if (type !== STRING) {
          throw new Error('Input type is not accepted');
        }
        break;
    }

    const cacheScan = promisify(scanType);

    // scanning in redis database
    do {
      const scanResult = await cacheScan(query);
      nextCursor = scanResult[NEXT_CURSOR_INDEX];
      const data = scanResult[DATA_INDEX];
      console.log(query);

      if (data) {
        result = result.concat(data);
      }
    } while (nextCursor !== FIRST_CURSOR && (result.length < count || count === NO_COUNT));

    return result;
  }

  save({
    key = '',
    data = '',
    type = STRING,
    expire = NO_EXPIRE
  }) {
    if (type === HASH) {
      for (let field in data) {
        super.hset(key, field, data[field]);
      }
    }

    if (type === SET) {
      const setMembers = [key].concat(data);
      super.sadd(setMembers);
    }

    if (type === ZSET) {
      for (let field in data) {
        super.zadd(key, field, data[field]);
      }
    }

    if (type === ZSET) {
      for (let field in data) {
        super.zadd(key, field, data[field]);
      }
    }

    if (type === STRING) {
      super.set(key, data);
    }

    // Set expire time for cache
    expire = expire || this.expire;

    if (expire !== NO_EXPIRE) {
      super.expire(key, expire);
    }
  }

  flush() {
    super.flushdb((err) => {
      throw err;
    });
  }
}

module.exports = {
  RedisWrap,
  NO_EXPIRE
};