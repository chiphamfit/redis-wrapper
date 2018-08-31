const createMongoClient = require('mongodb').connect;
const url = 'mongodb://localhost:27017/';
const dbName = 'cache_db';
const colName = 'cache_col';
const mock_name = [
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
const n_name = mock_name.length;

function randName() {
  // random number between 0 and n_name
  const i = Math.floor(Math.random() * n_name);
  return mock_name[i];
}

async function createCollection() {
  const client = await createMongoClient(url, { useNewUrlParser: true });
  const db = client.db(dbName);
  const col = db.collection(colName);
  return col;
}

async function clearData() {
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
      height: Math.random() * 2,
      weight: Math.random() * 85,
      sex: Math.random() < 0.5 ? 'male' : 'female'
    };

    listDoc.push(doc);
  }

  await col.insertMany(listDoc);
}

module.exports = {
  createCollection,
  generateData,
  clearData
};
