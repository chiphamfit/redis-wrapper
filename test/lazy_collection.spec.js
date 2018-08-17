/* eslint-env node, mocha */
const assert = require('chai').assert;
const {
  Enviroment,
  Db,
  LazyCollection
} = require('./environment');

describe('LazyCollection', () => {
  let lazyClient, db;
  const dbName = 'demo';
  const collectionName = 'inventory';

  before(async () => {
    const init = await Enviroment.init();
    lazyClient = Enviroment.lazyClient(240);
    db = lazyClient.db(dbName);
    assert.isUndefined(init);
  });

  describe('#constructor()', () => {
    it('Create a collection', async () => {
      assert.instanceOf(db, Db);
      const coll = await db.collection(collectionName);
      assert.instanceOf(coll, LazyCollection);
      assert.equal(coll.s.name, collectionName);
    });
  });

  describe('#find()', () => {
    it('Should return all documents', async () => {
      const coll = await db.collection(collectionName);
      const result = await coll.find(null, {
        ab: 'abc'
      });
      assert.isNotEmpty(result);
      assert.isObject(result[1]);
    });
  });

  describe('#findOne()', () => {
    it('Should return one document', async () => {
      const coll = await db.collection(collectionName);
      const result = await coll.findOne();
      assert.isObject(result);
    });
  });
});