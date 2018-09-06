/* eslint-env node, mocha */
const { LazyWrapper } = require('..');
const { amount, cleanUp, prepare, clientPair } = require('./env');
const { assert } = require('chai');

describe('LazyWrapper', () => {
  let coll, redis, lazyClient;
  const name = 'Noah';
  const expire = 120;
  const round = 20;
  const query = {
    name: name
  };

  before(async () => {
    const clients = await clientPair.getInstance();
    coll = clients.coll;
    redis = clients.redis;
    lazyClient = new LazyWrapper(coll, redis, expire);
    assert.instanceOf(lazyClient, LazyWrapper);

    // Prepare data for test
    await prepare();
  });

  after(async () => {
    await cleanUp();
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
    it(`find ${amount} documents, ${round} times in collection`, async () => {
      lazyClient = new LazyWrapper(coll, expire);

      for (let i = 0; i < round; i++) {
        const res = await lazyClient.find();
        assert.lengthOf(res, amount);
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
