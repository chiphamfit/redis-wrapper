import mongodb from 'mongodb';
import redis from 'redis';
import WrapperClient from './index';

const test = async () => {
  const redisClient = redis.createClient();
  const mongoClient = mongodb.connect('mongodb://localhost:27017/demo', {
    useNewUrlParser: true
  });
  const client = new WrapperClient(mongoClient, redisClient);
  await client.connect();
  await client.initialize('demo');
  const id = mongodb.ObjectID('5b601de9ef0a6ee26727382a');
  const option = {
    limit: 3,
    skip: 2,
    sort: {
      item: -1
    }
  };

  const result = await client.collection('inventory').findOne({}, option);
  console.log(result);
  client.disconnect();
}

test();
const res = redis.createClient();
res.zrangebyscore('inventory:instock:0:qty', `(${5}`, `${15}`, (err, rel) => {
  console.log(rel);
} );

const a = {
  $or: {
    ab: 'abc'
  },
  e: 'dgf'
}

console.log(a.$or.name);
// const mongoClient = mongodb.connect('mongodb://localhost:27017/demo', {
//   useNewUrlParser: true
// });
// console.log(mongoClient instanceof Promise);