/* eslint-env node, mocha */
const { LazyWrapper } = require('..');
const {
  cleanData,
  generateData,
  createCollection,
  RedisClient
} = require('./env');
const { assert } = require('chai');

describe.skip('LazyWrapper', () => {
  let coll, lazyClient;
  const name = 'Noah';
  const expire = 120;
  const round = 20;
  const nDocument = 500;
  const redis = new RedisClient();
  const query = {
    name: name
  };

  before(async () => {
    // Create collection
    coll = await createCollection();
    lazyClient = new LazyWrapper(coll, redis, expire);

    // Clean mongobd's data
    await cleanData();
    // clean cache data
    await lazyClient.flush();
    // Mocking data
    await generateData(nDocument);
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
    });
  });

  describe('#find()', () => {
    it(`find ${nDocument} documents, ${round} times in collection`, async () => {
      lazyClient = new LazyWrapper(coll, expire);

      for (let i = 0; i < round; i++) {
        const res = await lazyClient.find();
        assert.lengthOf(res, nDocument);
      }
    });

    it(`find all documents that have name ${name}, ${round} times in collection`, async () => {
      lazyClient = new LazyWrapper(coll, expire);

      for (let i = 0; i < round; i++) {
        const res = await lazyClient.find(query);

        // check if all documents have that name
        for (let doc of res) {
          assert.propertyVal(doc, 'name', name);
        }
      }
    });
  });

  describe('#findOne()', () => {
    it(`find the fisrt one documents, ${round} times in collection`, async () => {
      let res = [];
      lazyClient = new LazyWrapper(coll, expire);

      for (let i = 0; i < round; i++) {
        const doc = await lazyClient.findOne();

        if (res) {
          res.push(doc);
        }
      }

      assert.lengthOf(res, round);
    });

    it(`find the fisrt one documents have name ${name}, ${round} times in collection`, async () => {
      lazyClient = new LazyWrapper(coll, expire);

      for (let i = 0; i < round; i++) {
        const res = await lazyClient.findOne(query);
        assert.propertyVal(res, 'name', name);
      }
    });
  });

  describe('#flush()', () => {
    it('Clean all data cached by LazyWrapper in memories', async () => {
      return await lazyClient.flush();
    });
  });
});
