import mongodb from 'C:/Users/chipham/AppData/Local/Microsoft/TypeScript/2.9/node_modules/@types/mongodb';
import redis from 'C:/Users/chipham/AppData/Local/Microsoft/TypeScript/2.9/node_modules/@types/redis';
import * as index from '.'; 

const test = async () => {
  const redisClient = redis.createClient();
  const mongoClient = mongodb.connect('mongodb://localhost:27017/demo', {
    useNewUrlParser: true
  });
  const client = await index.createClient(null, redisClient);
  await client.init();
  const cursor = await client.collection('demo').find(mongodb.ObjectID('5b57db6722f1f2a75c64f1eb'));
  client.exit();
}

test();