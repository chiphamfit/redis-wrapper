/* eslint-env node, mocha */
const { LazyWrapper } = require('..');
const { cleanData, generateData, createCollection } = require('./env');
const assert = require('chai').assert;

const docAmount = 500;
const round = 5000;
let cachingTime = 0;
let normalTime = 0;

describe('Test performance between Lazy caching and non-caching, please wait...', () => {
  before(async () => {
    // Clean data
    it('Cleaning database', async () => {
      return await cleanData();
    });

    // Mocking data
    it(`Generating ${docAmount} documents`, async () => {
      return await generateData(docAmount);
    });
  });

  it('find using lazy caching', async () => {
    try {
      const coll = await createCollection();
      const lazy = new LazyWrapper(coll, 120);
      // Init cache data
      await lazy.find();
      const start = new Date();

      for (let i = 0; i < round; i++) {
        const res = await lazy.find();
        assert.equal(res.length, docAmount);
      }

      const end = new Date();
      cachingTime = end - start;
    } catch (error) {
      console.log(error);
      assert.isUndefined(error);
    }

    assert.ok(true);
  });

  it('non-caching find', async () => {
    try {
      const coll = await createCollection();
      const start = new Date();

      for (let i = 0; i < round; i++) {
        const res = await coll.find().toArray();
        assert.equal(res.length, docAmount);
      }

      const end = new Date();
      normalTime = end - start;
    } catch (error) {
      console.log(error);
      assert.isUndefined(error);
    }

    assert.ok(true);
  });
});

after(() => {
  const percent = ((normalTime / cachingTime) * 100).toFixed(2);
  console.log('============ Result ============');
  console.log(`Number of documents: ${docAmount}`);
  console.log(`Find times: ${round}`);
  console.log('\n Lazy Caching');
  console.log(`Total time for queries caching: ${cachingTime} ms`);
  console.log(`Average time for each round: ${cachingTime / round} ms\n`);
  console.log(' Non Caching');
  console.log(`Total time for queries non-caching: ${normalTime} ms`);
  console.log(`Average time for each round: ${normalTime / round} ms\n`);
  console.log(`Lazy mode queries faster by ${normalTime - cachingTime} ms`);
  console.log(`That is ${percent}% faster`);
});
