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
  const id = mongodb.ObjectID('5b57db5022f1f2a75c64f1ea');
  const result = await client.collection('inventory').find({}, {sort: {item: 1, size: 1} });
  result.forEach(doc => {
    console.log(JSON.stringify(doc));
  })
  // const cursor = await client.collection('demo').find();
  client.disconnect();
}

test();
// const mongoClient = mongodb.connect('mongodb://localhost:27017/demo', {
//   useNewUrlParser: true
// });
// console.log(mongoClient instanceof Promise);