/* eslint-env node, mocha */
const assert = require('chai').assert;
const {
  Enviroment,
} = require('./config');

describe('Collection', () => {
  let lazyClient, fullClient;
  const dbName = 'demo';
  const collectionName = 'inventory';

  before(async () => {
    const init = await Enviroment.init();
    assert.isUndefined(init);
    lazyClient = Enviroment.lazyClient(240);
    fullClient = Enviroment.fullClient();
  });

  it('#constructor(): Create a collection', () => {
    // Lazy client
    const coll = lazyClient.db(dbName).collection(collectionName);
    assert.equal(coll.name, collectionName);
  });
});