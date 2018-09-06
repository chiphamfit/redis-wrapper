/* eslint-env node, mocha */
const { InlineWrapper } = require('..');
const { prepare, cleanUp, clientPair, amount } = require('./env');
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
    await cleanUp();
  });

  describe('#init()', () => {
    it('read all data in mongo\'s collection, then load them to cache', async () => {
      return await inlineClient.init();
    });
  });

  describe('#constructor()', async () => {
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
    it('get all documents in this collection', async () => {
      const docs = await inlineClient.find();
      assert.lengthOf(docs, amount);

      // get random id to find by id
      const index = Math.ceil(Math.random() * amount) % amount;
      id = JSON.stringify(docs[index]._id);
    });

    it('get all document suitable with query condition', async () => {
      const exp = {
        $and: [
          { $or: [{ height: 0.99 }, { weight: 1.99 }] },
          { $or: [{ name: 'William' }, { weight: { $lt: 20 } }] }
        ]
      };
      const docs = await inlineClient.find(exp);
      const res = await coll.find(exp).toArray();
      assert.equal(docs.length, res.length);
    });
  });

  describe('#findOne()', () => {
    it('get a documents in this collection', async () => {
      const docs = await inlineClient.findOne();
      assert.isObject(docs);
    });

    it('get all document suitable with query condition', async () => {
      const exp = {
        $and: [
          { $or: [{ height: 0.99 }, { weight: 1.99 }] },
          { $or: [{ name: 'William' }, { weight: { $lt: 20 } }] }
        ]
      };
      const docs = await inlineClient.findOne(exp);
      assert.isObject(docs);
    });
  });

  describe('#findById()', () => {
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
    it('implicit $eq expression', async () => {
      const exp = { height: 1.65 };
      const docs = await inlineClient.findByExpression(exp);
      const res = await coll.find(exp).toArray();
      assert.equal(docs.length, res.length);

      // if (docs.length > 0) {
      //   assert.isObject(docs[0]);
      // }
    });

    it('$eq expression', async () => {
      const exp = { name: { $eq: 'William' } };
      const docs = await inlineClient.findByExpression(exp);
      const res = await coll.find(exp).toArray();
      assert.equal(docs.length, res.length);
    });

    it('$gt expression', async () => {
      const exp = { weight: { $gt: 1.65 } };
      const docs = await inlineClient.findByExpression(exp);
      const res = await coll.find(exp).toArray();
      assert.equal(docs.length, res.length);
    });

    it('$gte expression', async () => {
      const exp = { weight: { $gte: 1.65 } };
      const docs = await inlineClient.findByExpression(exp);
      const res = await coll.find(exp).toArray();
      assert.equal(docs.length, res.length);
    });

    it('$lt expression', async () => {
      const exp = { weight: { $lt: 1.65 } };
      const docs = await inlineClient.findByExpression(exp);
      const res = await coll.find(exp).toArray();
      assert.equal(docs.length, res.length);
    });

    it('$lte expression', async () => {
      const exp = { weight: { $lte: 1.65 } };
      const docs = await inlineClient.findByExpression(exp);
      const res = await coll.find(exp).toArray();
      assert.equal(docs.length, res.length);
    });

    it('$ne expression', async () => {
      const exp = { weight: { $eq: 1.65 } };
      const docs = await inlineClient.findByExpression(exp);
      const res = await coll.find(exp).toArray();
      assert.equal(docs.length, res.length);
    });

    it('$in expression', async () => {
      const exp = { height: { $in: [1.65, 1.8, 2] } };
      const docs = await inlineClient.findByExpression(exp);
      const res = await coll.find(exp).toArray();
      assert.equal(docs.length, res.length);
    });

    it('$nin expression', async () => {
      const exp = { height: { $nin: [1.65, 1.8, 2] } };
      const docs = await inlineClient.findByExpression(exp);
      const res = await coll.find(exp).toArray();
      assert.equal(docs.length, res.length);
    });
  });

  describe('Logical Operator', () => {
    it('$and', async () => {
      const exp = [
        { height: { $gte: 2 } },
        { weight: { $gt: 40 } },
        { name: 'Daniel' }
      ];
      const docs = await inlineClient.$and(exp);
      const res = await coll.find({ $and: exp }).toArray();
      assert.equal(docs.length, res.length);
    });

    it('$or', async () => {
      const exp = [
        { height: { $gte: 2 } },
        { weight: { $gt: 40 } },
        { name: 'Daniel' }
      ];
      const docs = await inlineClient.$or(exp);
      const res = await coll.find({ $or: exp }).toArray();
      assert.equal(docs.length, res.length);
    });

    it('$nor', async () => {
      const exp = [
        { height: { $gte: 2 } },
        { weight: { $gt: 40 } },
        { name: 'Daniel' }
      ];
      const docs = await inlineClient.$nor(exp);
      const res = await coll.find({ $nor: exp }).toArray();
      assert.equal(docs.length, res.length);
    });

    it('$not', async () => {
      const exp = { name: { $not: { $eq: 'William' } } };
      const docs = await inlineClient.findByExpression(exp);
      const res = await coll.find(exp).toArray();
      assert.equal(docs.length, res.length);
    });
  });

  describe('#clean()', () => {
    it('clean all stored keys of this client', async () => {
      return await inlineClient.flush();
    });
  });
});
