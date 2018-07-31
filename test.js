import mongodb from 'mongodb';
import redis from 'redis';
import wrapper from './index';

const redisClient = redis.createClient();
const mongoClient = mongodb.connect('mongodb://localhost:27017/demo', {
  useNewUrlParser: true
});
const client = new wrapper();
// client.init({}, redisClient);
client.init(mongoClient, redisClient);
