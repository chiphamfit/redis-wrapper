/* eslint-env node, mocha */
const { InlineWrapper } = require('..');
const { prepare, cleanUp, clientPair } = require('./env');
const assert = require('chai').assert;

describe('InlineWrapper', () => {
  let inlineClient, redis, coll, id;

  before(async () => {
    const clients = await clientPair.getInstance();
    coll = clients.coll;
    redis = clients.redis;
    inlineClient = new InlineWrapper(coll, redis);
    assert.instanceOf(inlineClient, InlineWrapper);

    // Prepare data for test
    await prepare();
  });

  after(async () => {
    // await cleanUp();
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

  describe.skip('#find()', () => {
    it('get all documents in this collection', async () => {
      const docs = await inlineClient.find();
      assert.lengthOf(docs, nDocument);

      // get random id to find by id
      const index = Math.ceil(Math.random() * nDocument) % nDocument;
      id = JSON.stringify(docs[index]._id);
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

  describe('#findByExpression()', () => {
    it.skip('implicit $eq expression', async () => {
      const exp = { height: 1.65 };
      const docs = await inlineClient.findByExpression(exp);
      assert.isArray(docs);
      assert.isNotNull(docs[0]);
      // console.log(docs.length);
    });

    it('$eq expression', async () => {
      const exp = { weight: { $eq: 1.65 } };
      const docs = await inlineClient.findByExpression(exp);
      assert.isArray(docs);
      assert.isObject(docs[0]);
      // console.log(docs.length);
    });

    it('$gt expression', async () => {
      const exp = { weight: { $gt: 1.65 } };
      const docs = await inlineClient.findByExpression(exp);
      assert.isArray(docs);
      assert.isObject(docs[0]);
      // console.log(docs.length);
    });

    it('$gte expression', async () => {
      const exp = { weight: { $gte: 1.65 } };
      const docs = await inlineClient.findByExpression(exp);
      assert.isArray(docs);
      assert.isObject(docs[0]);
      // console.log(docs.length);
    });

    it('$lt expression', async () => {
      const exp = { weight: { $lt: 1.65 } };
      const docs = await inlineClient.findByExpression(exp);
      assert.isArray(docs);
      assert.isObject(docs[0]);
      // console.log(docs.length);
    });

    it('$lte expression', async () => {
      const exp = { weight: { $lte: 1.65 } };
      const docs = await inlineClient.findByExpression(exp);
      assert.isArray(docs);
      assert.isObject(docs[0]);
      // console.log(docs.length);
    });

    it('$ne expression', async () => {
      const exp = { weight: { $eq: 1.65 } };
      const docs = await inlineClient.findByExpression(exp);
      assert.isArray(docs);
      assert.isObject(docs[0]);
      // console.log(docs.length);
    });

    it('$in expression', async () => {
      const exp = { weight: { $in: [1.65, 1.8, 2] } };
      const docs = await inlineClient.findByExpression(exp);
      assert.isArray(docs);
      assert.isObject(docs[0]);
      // console.log(docs.length);
    });

    it('$nin expression', async () => {
      const exp = { weight: { $nin: [1.65, 1.8, 2] } };
      const docs = await inlineClient.findByExpression(exp);
      assert.isArray(docs);
      assert.isObject(docs[0]);
      // // console.log(docs.length);
    });
  });

  describe.skip('#clean()', () => {
    it('clean all stored keys of this client', async () => {
      return await inlineClient.flush();
    });
  });
});
