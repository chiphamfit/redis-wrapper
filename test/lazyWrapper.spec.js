/* eslint-env node, mocha */
const { LazyWrapper } = require('..');
const {
  clearData,
  generateData,
  createCollection,
  RedisClient
} = require('./env');
const { assert } = require('chai');

describe('LazyWrapper', () => {
  let coll, lazyClient;
  const name = 'Noah';
  const expire = 120;
  const round = 200;
  const nDocument = 5000;
  const redis = new RedisClient();
  const query = {
    name: name
  };

  before(async () => {
    try {
      // Clean data
      await clearData();
      // Mocking data
      await generateData(nDocument);
      coll = await createCollection();
    } catch (error) {
      assert.isNull(error);
    }

    assert.ok(coll);
  });

  describe('#constructor()', () => {
    it('create instance of LazyWrapper, with full parameters', () => {
      lazyClient = new LazyWrapper(coll, redis, expire);
      assert.instanceOf(lazyClient, LazyWrapper);
    });

    it('create instance of LazyWrapper, bypass redis client', () => {
      lazyClient = new LazyWrapper(coll, expire);
      assert.instanceOf(lazyClient, LazyWrapper);
    });

    it('create instance of LazyWrapper, bypass expire time', () => {
      lazyClient = new LazyWrapper(coll, redis);
      assert.instanceOf(lazyClient, LazyWrapper);
    });

    it('create error when bypass collection time', () => {
      try {
        lazyClient = new LazyWrapper(redis, expire);
        assert.instanceOf(lazyClient, LazyWrapper);
      } catch (error) {
        assert.instanceOf(error, TypeError);
      }

      assert.ok(true);
    });
  });

  describe('#find()', () => {
    it(`find ${nDocument} documents, ${round} times in collection`, async () => {
      lazyClient = new LazyWrapper(coll, expire);

      for (let i = 0; i < round; i++) {
        const res = await lazyClient.find();
        assert.equal(res.length, nDocument);
        assert.ok(res);
      }
    });

    it(`find all documents that have name ${name}, ${round} times in collection`, async () => {
      lazyClient = new LazyWrapper(coll, expire);

      for (let i = 0; i < round; i++) {
        const res = await lazyClient.find(query);

        // check if all documents have that name
        for (let i = 0, length = res.length; i < length; i++) {
          assert.equal(res[i].name, name);
        }
        assert.ok(res);
      }
    });
  });

  describe('#findOne()', () => {
    it(`find the fisrt one documents, ${round} times in collection`, async () => {
      lazyClient = new LazyWrapper(coll, expire);

      for (let i = 0; i < round; i++) {
        const res = await lazyClient.findOne();
        assert.isObject(res);
        assert.ok(res);
      }
    });

    it(`find the fisrt one documents have name ${name}, ${round} times in collection`, async () => {
      lazyClient = new LazyWrapper(coll, expire);

      for (let i = 0; i < round; i++) {
        const res = await lazyClient.findOne(query);
        assert.equal(res.name, name);
        assert.ok(res);
      }
    });
  });

  describe('#cleanCache()', () => {
    it('Clean all data cached by LazyWrapper in memories', async () => {
      return await lazyClient.cleanCache();
    });
  });
});
