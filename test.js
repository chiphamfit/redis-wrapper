const Wrapper = require('./src/wrapper');
const Mongo = require('mongodb').MongoClient;
const Redis = require('redis').createClient;

const client = Mongo.connect(
  'mongodb://localhost:27017/demo',
  {
    useNewUrlParser: true
  }
);

const redis = Redis();

const arr = [];
arr.push('a');
arr[1] = 'abc';
console.log(arr);
// const _client = new Wrapper(redis, client);
// _client.connect().then(client => {
//   const db = client.db('demo');
//   const collection = db.cacheCollection('inventory');
//   collection.initCache();
//   client.redisWrapper
//     .compare('demo.inventory.size.h', [1567], '$nin')
//     .then(val => {
//       // console.log(val);
//     });

//   const abc = {
//     $or: [{ item: 'paper' }, { some: 'abcdef' }],
//     name: {
//       $not: { poro: 123 }
//     },
//     label: {
//       $nin: ['a', 'b', 'c']
//     }
//   };

//   const t = standarizeQuery(abc, 'abc');

//   console.log(JSON.stringify(t));
//   // abc.forEach(element => {
//   //   // console.log(JSON.stringify(element));
//   // });
//   // console.log(JSON.stringify(abc));
//   // console.log(abc[0].$and[1].$or);
// });
