const createMongoClient = require('mongodb').connect;
const { RedisClient } = require('redis');

const def_name = [
  'Jacob',
  'Sophia',
  'Mason',
  'Isabella',
  'William',
  'Emma',
  'Jayden',
  'Olivia',
  'Noah',
  'Ava',
  'Michael',
  'Emily',
  'Ethan',
  'Abigail',
  'Alexander',
  'Madison',
  'Aiden',
  'Mia',
  'Daniel',
  'Chloe'
];

const url = 'mongodb://localhost:27017/';
const dbName = 'cache_db';
const colName = 'cache_coll';
const nName = def_name.length;
const amount = 5000;

const clientPair = (function() {
  let clients;

  async function createInstance() {
    const client = await createMongoClient(url, { useNewUrlParser: true });
    const db = client.db(dbName);
    const coll = db.collection(colName);
    const redis = new RedisClient();
    return { db, coll, redis };
  }

  return {
    getInstance: async function() {
      if (!clients) {
        clients = await createInstance();
      }

      return clients;
    }
  };
})();

function randName() {
  // random number between 0 and nName
  const i = Math.floor(Math.random() * nName);
  return def_name[i];
}

async function cleanUp() {
  const clients = await clientPair.getInstance();
  const coll = clients.coll;
  await coll.drop();
  clients.redis.flushall();
}

async function prepare() {
  const clients = await clientPair.getInstance();
  const coll = clients.coll;
  const buffer = 1000;
  const nloop = amount / buffer;

  for (let i = 0; i < nloop; i++) {
    const ceil = Math.min(buffer, amount);
    const listDoc = [];

    for (let j = 0; j < ceil; j++) {
      const doc = {
        name: randName(),
        height: Number((Math.random() * 2).toFixed(2)),
        weight: Number((Math.random() * 85).toFixed(2)),
        sex: Math.random() < 0.5 ? 'male' : 'female'
      };

      listDoc.push(doc);
    }

    await coll.insertMany(listDoc);
  }
}

module.exports = {
  amount,
  prepare,
  cleanUp,
  clientPair
};
