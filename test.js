const Wrapper = require('./src/wrapper');
const Mongo = require('mongodb').MongoClient;
const Redis = require('redis').createClient;

const standarizeQuery = require('./src/collection/through_collection')
  .standarizeQuery;

const client = Mongo.connect(
  'mongodb://localhost:27017/demo',
  {
    useNewUrlParser: true
  }
);

const redis = Redis();

const _client = new Wrapper(redis, client);
_client.connect().then(client => {
  const db = client.db('demo');
  const collection = db.cacheCollection('inventory');
  collection.initCache();
  client.redisWrapper
    .compare('demo.inventory.size.h', [1567], '$nin')
    .then(val => {
      // console.log(val);
    });

  const abc = standarizeQuery(
    {
      item: 'paper',
      name: {
        $not: { poro: 123 }
      },
      some: 'abcdef',
      label: {
        $nin: ['a', 'b', 'c']
      }
    },
    'nameholder'
  );

  console.log(JSON.stringify(abc));
  abc.forEach(element => {
    // console.log(JSON.stringify(element));
  });
  // console.log(JSON.stringify(abc));
  // console.log(abc[0].$and[1].$or);
});

// [
//   ,
//   {
//     $eq: [
//       { b: 'asda' },
//       { c: 12312 },
//       {
//         d: {
//           e: 1232131
//         }
//       }
//     ]
//   }
// ],
