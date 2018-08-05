import mongodb from 'mongodb';
import redis from 'redis';
import {
  mongo_url,
  parserOption
} from '../../config';

export async function connect(mongoClient, redisClient) {
  if (!mongoClient) {
    mongoClient = await mongodb.connect(mongo_url, parserOption);
  } else {
    await mongoClient
  }

  const _redisClient = await (redisClient || redis.createClient());
  _redisClient.on('error', (err) => {
    throw err;
  });

  return true;
}

export async function initialize(mongoClient, redisClient) {
  if (!mongoClient) {
    throw new Error('Invalid input: mongoClient is ' + typeof mongoClient);
  }

  if (!redisClient) {
    throw new Error('Invalid input: redisClient is ' + typeof redisClient);
  }

  const mongoDb = (await mongoClient).db();
  const listCollections = await mongoDb.listCollections().toArray();

  for (let i = 0, length = listCollections.length; i < length; i++) {
    const collection = listCollections[i];
    const cursor = await mongoDb.collection(collection.name).find();
    const listDocuments = await cursor.toArray();
    await insertDocuments(redisClient, collection.name, listDocuments);
  }
}

async function insertDocuments(redisClient, collectionName, listDocuments) {
  listDocuments.forEach(async (document) => {
    const key = `${document._id}`;
    await redisClient.set(key, JSON.stringify(document));
    await insertIndexs(redisClient, collectionName, document);
  })
}

function insertIndexs(redisClient, collectionName, document) {
  const id = `${document._id}`;
  for (let field in document) {
    if (field !== '_id') {
      const value = document[field];
      if (typeof(value) === 'object') {
        let subObj = createChild(field, id, value);
        insertIndexs(redisClient, collectionName, subObj);
      } else if (isNaN(value)) {
        const key = `${collectionName}:${field}:${value}`;
        redisClient.sadd(key, id);
      } else {
        const key = `${collectionName}:${field}`;
        redisClient.zadd(key, value, id);
      }
    }
  }
}

function createChild(prefix, id, object) {
  const child = {};
  for (let field in object) {
    let _field = `${prefix}:${field}`;
    child[_field] = object[field];
  }
  if (!child._id) {
    child._id = id;
  }
  return child;
}