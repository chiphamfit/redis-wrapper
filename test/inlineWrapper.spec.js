/* eslint-env node, mocha */
const { InlineWrapper } = require('..');
const { createCollection, generateData, clearData } = require('./env');
const assert = require('chai').assert;

const nDocument = 5000;
let coll, fullColl;

describe('find', () => {
  before('', async () => {
    // Clean data
    await clearData();
    // Mocking data
    await generateData(nDocument);

    coll = await createCollection();
    fullColl = new InlineWrapper(coll);

    // Clear database
    it('Cleaned mongo data', async () => {
      await clearData();
    });

    // Mocking data
    it(`Generated ${nDocument} documents`, async () => {
      return await generateData(nDocument);
    });

    it('Init database', async () => {
      await fullColl.init();
    });
  });

  it('find document', async () => {
    const colls = await fullColl.find();
    assert.equal(colls.length, nDocument);
  });
});
