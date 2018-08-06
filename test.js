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
  const id = mongodb.ObjectID('5b593fa93f80a135f0c25c78');
  const result = await client.collection('inventory').findOne({}, {});
  console.log(result);
  // const cursor = await client.collection('demo').find();
  client.disconnect();
}

test();