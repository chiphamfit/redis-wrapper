import mongodb from 'mongodb';
import redis from 'redis';
import * as index from './index'; 

const test = async () => {
  const redisClient = redis.createClient();
  const mongoClient = mongodb.connect('mongodb://localhost:27017/demo', {
    useNewUrlParser: true
  });
  const client = await index.createClient(null, null);
  await client.init();
  console.log(await client.collection('demo').find({}));
}

test();