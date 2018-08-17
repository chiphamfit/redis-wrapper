/* eslint-env node, mocha */
const assert = require('chai').assert;
const {
  Enviroment,
  Wrapper,
  Db
} = require('./environment');

describe('Wrapper', () => {
  let lazyClient, fullClient;
  const expire = 240;
  const dbName = 'test';

  before((done) => {
    Enviroment.init()
      .then(() => {
        lazyClient = Enviroment.lazyClient(expire);
        fullClient = Enviroment.fullClient();
        done();
      });
  });

  describe('#constructor()', () => {
    it('Create a Wrapper for Lazy-load cache', () => {
      assert.instanceOf(lazyClient, Wrapper);
      assert.equal(lazyClient.options.expire, expire);
      assert.equal(lazyClient.options.mode, 'lazy');
    });

    it('Create a Wrapper for Full-load cache', () => {
      assert.instanceOf(fullClient, Wrapper);
      assert.equal(fullClient.options.expire, -1);
      assert.equal(fullClient.options.mode, 'full');
    });
  });

  describe('#db()', () => {
    it(`Create a db(${dbName}) on Lazy-load client`, () => {
      // Test on lazy client
      const db = lazyClient.db('demo');
      assert.instanceOf(db, Db);
      assert.equal(db.name, 'demo');
    });

    it(`Create a db(${dbName}) on Full-load client`, () => {
      // Test on full client
      const db_full = fullClient.db(dbName);
      assert.instanceOf(db_full, Db);
      assert.equal(db_full.name, dbName);
    });
  });

  describe.skip('#clearCache()', () => {
    it('Clean all data in redis cache', async () => {
      const init = await Enviroment.initCache();
      assert.isUndefined(init);
      const clear = await lazyClient.clearCache();
      assert.isUndefined(clear);
      Enviroment.redis.scan('0', (error, result) => {
        assert.isNull(error, 'cache not cleaned');
        assert.isEmpty(result[1]);
      });
    });
  });
});