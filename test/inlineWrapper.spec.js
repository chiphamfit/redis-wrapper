/* eslint-env node, mocha */
const { InlineWrapper } = require('..');
const {
  createCollection,
  generateData,
  cleanData,
  RedisClient
} = require('./env');
const assert = require('chai').assert;

const nDocument = 50000;

describe('InlineWrapper', () => {
  const redis = new RedisClient();
  let inlineClient, coll, id;

  before(async () => {
    // Cleanup
    await cleanData();
    redis.flushall();

    // Mock data
    await generateData(nDocument);

    coll = await createCollection();
    inlineClient = new InlineWrapper(coll, redis);
    assert.instanceOf(inlineClient, InlineWrapper);
  });

  describe('#init()', () => {
    it('read all data in mongo\'s collection, then load them to cache', async () => {
      return await inlineClient.init();
    });
  });

  describe.skip('#constructor()', async () => {
    it('create instance of InlineWrapper, with full parameters', () => {
      const constructClient = new InlineWrapper(coll, redis);
      assert.instanceOf(constructClient, InlineWrapper);
    });

    it('create instance of InlineWrapper, bypass redis client', () => {
      const constructClient = new InlineWrapper(coll);
      assert.instanceOf(constructClient, InlineWrapper);
    });

    it('create instance of InlineWrapper, bypass expire time', () => {
      const constructClient = new InlineWrapper(coll, redis);
      assert.instanceOf(constructClient, InlineWrapper);
    });

    it('create error when bypass collection time', () => {
      try {
        const constructClient = new InlineWrapper(redis);
        assert.instanceOf(constructClient, InlineWrapper);
      } catch (error) {
        assert.instanceOf(error, TypeError);
      }
    });
  });

  describe('#find()', () => {
    it.skip('get all documents in this collection', async () => {
      const docs = await inlineClient.find();
      assert.lengthOf(docs, nDocument);

      // get random id to find by id
      const index = Math.ceil(Math.random() * nDocument) % nDocument;
      id = JSON.stringify(docs[index]._id);
    });

    it('get documents that satisfies the query', async () => {
      // const query = {
      //   $or: [{ height: 1.65 }, { weight: 65 }]
      // };
      const exp = { height: 1.65 };
      const docs = await inlineClient.findByExpression(exp);
      assert.isArray(docs);
      assert.isNotNull(docs[0]);
    });
  });

  describe.skip('#findById()', () => {
    it('return a document has id equal with query\'s id', async () => {
      const doc = await inlineClient.findById(id);
      assert.equal(JSON.stringify(doc._id), id);
    });

    it('return null when document not found', async () => {
      const doc = await inlineClient.findById();
      assert.isNull(doc);
    });
  });

  describe.skip('#clean()', () => {
    it('clean all stored keys of this client', async () => {
      return await inlineClient.flush();
    });
  });
});
