/* eslint-env node, mocha */
const RedisWrapper = require('..');
const { createCollection } = require('./env');
const assert = require('chai').assert;

let coll, client, fullColl;

before('', async () => {
  coll = await createCollection();
  client = new RedisWrapper(coll);
  fullColl = client.fullyCaching();
  await fullColl.initCache();
});

describe('find', () => {
  it('find document', async () => {
    return await fullColl.find();
  });

  it('non cache', async () => {
    await coll.find().toArray();
    assert.ok(true);
  });
});
