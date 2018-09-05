const createMongoClient = require('mongodb').connect;
const { RedisClient } = require('../lib/ulti/helper');

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
const dbName = 'testing';
const colName = 'cacheColl';
const nName = def_name.length;

function randName() {
  // random number between 0 and nName
  const i = Math.floor(Math.random() * nName);
  return def_name[i];
}

async function createCollection() {
  const client = await createMongoClient(url, { useNewUrlParser: true });
  const db = client.db(dbName);
  const col = db.collection(colName);
  return col;
}

async function cleanData() {
  try {
    const col = await createCollection();
    await col.drop();
  } catch (error) {
    console.log(error.message);
  }
}

// create mock database
async function generateData(amount) {
  const col = await createCollection();
  const listDoc = [];

  for (let i = 0; i < amount; i++) {
    const doc = {
      name: randName(),
      height: (Math.random() * 2).toFixed(2),
      weight: (Math.random() * 85).toFixed(2),
      sex: Math.random() < 0.5 ? 'male' : 'female'
    };

    listDoc.push(doc);
  }

  await col.insertMany(listDoc);
}

module.exports = {
  createCollection,
  generateData,
  cleanData,
  RedisClient
};
