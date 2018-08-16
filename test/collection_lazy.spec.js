/* eslint-env node, mocha */
const assert = require('chai').assert;
const {
  Enviroment,
  Db,
  CollectionLazy
} = require('./config');

describe('CollectionLazy', () => {
  let lazyClient;
  const dbName = 'demo';
  const collectionName = 'inventory';

  before(async () => {
    const init = await Enviroment.init();
    assert.isUndefined(init);
    lazyClient = Enviroment.lazyClient(240);
  });

  it('#constructor(): Create a collection',async () => {
    // Lazy client
    const db = lazyClient.db(dbName);
    assert.instanceOf(db, Db);
    const coll = await db.collection(collectionName);
    assert.instanceOf(coll, CollectionLazy);
    assert.equal(coll.s.name, collectionName);
  });
});