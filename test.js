import mongodb from 'mongodb';
import redis from 'redis';
import WrapperClient from './index'; 

const test = async () => {
  const redisClient = redis.createClient();
  const mongoClient = mongodb.connect('mongodb://localhost:27017/demo', {
    useNewUrlParser: true
  });
  const client = await new WrapperClient(mongoClient, redisClient);
  await client.initialize('demo');
  // const cursor = await client.collection('demo').find(mongodb.ObjectID('5b57db6722f1f2a75c64f1eb'));
  client.disconnect();
}

test();