import mongodb from 'mongodb';
import redis from 'redis';
import WrapperClient from './index';
import {createKey} from './src/operations/find'

const test = async () => {
  const redisClient = redis.createClient();
  const mongoClient = mongodb.connect('mongodb://localhost:27017/demo', {
    useNewUrlParser: true
  });
  const client = new WrapperClient(mongoClient, redisClient);
  await client.connect();
  // await client.initialize('demo');
  const id = mongodb.ObjectID('5b601de9ef0a6ae26727382d');
  const option = {
    limit: 3,
    skip: 2,
    sort: {
      item: -1
    }
  };
  
  const result = await client.collection('inventory').findOne(id, option);
  console.log(result);
  client.disconnect();
}

const query = {
  name: 'John',
  sub: {
    abc: 123
  }
}

test();
// const mongoClient = mongodb.connect('mongodb://localhost:27017/demo', {
//   useNewUrlParser: true
// });
// console.log(mongoClient instanceof Promise);