// /* eslint-env node, mocha */
const assert = require('chai').assert;
const {
  Enviroment,
} = require('./environment');

describe('Database', () => {
  let lazyClient, fullClient;
  const dbName = 'demo';

  before((done) => {
    Enviroment.init().then(() => {
      lazyClient = Enviroment.lazyClient(240);
      fullClient = Enviroment.fullClient();
      done();
    });
  });

  describe('#constructor()', () => {
    it('Create a data base from Lazy-load client', () => {
      const db = lazyClient.db(dbName);
      assert.equal(db.name, dbName);
    });
  });

  describe('#db()', () => {
    it('Create a data base from Full-load client', () => {
      const db = fullClient.db(dbName);
      assert.equal(db.name, dbName);
    });

    it('Get all collections from database', async () => {
      const db = lazyClient.db(dbName);
      const collections = await db.collections();
      assert.isNotEmpty(collections);
    });
  });
});