const Wrapper = require('./src/wrapper');
const Mongo = require('mongodb').MongoClient;
const Redis = require('redis').createClient;

const client = Mongo.connect('mongodb://localhost:27017/demo', {
  useNewUrlParser: true
});

const redis = Redis();


const _client = new Wrapper(redis, client);
_client.connect().then((client) => {
  const db = client.db('demo');
  const collection = db.cacheCollection('complex');
  collection.initCacheDb();
});