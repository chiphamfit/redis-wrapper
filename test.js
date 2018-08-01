import mongodb from 'mongodb';
import redis from 'redis';
import * as app from './app'; 

const test = async () => {
  const redisClient = redis.createClient();
  const mongoClient = mongodb.connect('mongodb://localhost:27017/demo', {
    useNewUrlParser: true
  });
  const client = await app.createClient(mongoClient, redisClient);
  const docs = await client.collection('inventory').find({});
  console.log(docs);
  // console.log(collections);
}

test();