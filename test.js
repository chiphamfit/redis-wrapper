import mongodb from 'mongodb';
import redis from 'redis';
import wrapper from './src/wrapper';

const redisClient = redis.createClient();
const mongoClient = mongodb.connect('mongodb://localhost:27017/demo', {
  useNewUrlParser: true
});
const client = new wrapper(mongoClient, redisClient);
client.connect();

// client.init({}, redisClient);