import mongodb from 'mongodb';
import redis from 'redis';
import * as app from './app'; 

const test = async () => {
  const redisClient = redis.createClient();
  const mongoClient = mongodb.connect('mongodb://localhost:27017/demo', {
    useNewUrlParser: true
  });
  const client = await app.createClient(mongoClient, redisClient);
  client.collection('car').find({});
  // console.log(collections);
}

test();