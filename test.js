const Wrapper = require('./src/wrapper');
const Mongo = require('mongodb').MongoClient;

const client = Mongo.connect('mongodb://localhost:27017/demo', {
  useNewUrlParser: true
});

const _client = new Wrapper(client, 120);
_client.connect().then((client) => {
  const db = client.db('demo');
  const collection = db.cacheCollection('inventory');
  collection.find().then((result) => {
    console.log((result));
  });

  // collection.deleteOne({
  //   item: 'planner',
  //   status: 'D'
  // }, (err, obj) => {
  //   console.log(obj);
  // });
  // const result = collection.findOne().then((result) => {
  //   console.log(result);
  // });
  // const query = {
  //   item: 'postcard',
  //   status: 'A'
  // };
  // const a = JSON.stringify(query).replace(/[{},]/gi, '*');
  // console.log(a);
  // collection.redisWrapper.client.sscan('78d69bc739a0d404b82094bbd4a3e803', '0', 'match', a, (error, result) => {
  //   console.log(result);
  // });
});