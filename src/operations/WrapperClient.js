import mongodb from 'mongodb';
import redis from 'redis';
import {
  isEmpty
} from './subFunctions'
import {
  mongo_url,
  mongo_parse_option
} from '../../config';

export async function connect(mongoClient, redisClient) {
  if (isEmpty(mongoClient)) {
    mongoClient = await mongodb.connect(mongo_url, mongo_parse_option);
  } else {
    await mongoClient
  }

  const _redisClient = await (redisClient || redis.createClient());
  _redisClient.on('error', (err) => {
    return err;
  });

  return true;
}

export async function initialize(mongoClient, redisClient) {
  if (isEmpty(mongoClient)) {
    return new Error('Invalid input: mongoClient is ' + typeof mongoClient);
  }

  if (isEmpty(redisClient)) {
    return new Error('Invalid input: redisClient is ' + typeof redisClient);
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
    await redisClient.hset(collectionName, key, JSON.stringify(document));
    await insertIndexs(redisClient, collectionName, document);
  })
}

function insertIndexs(redisClient, collectionName, document) {
  const id = `${document._id}`;
  for (let field in document) {
    //ignore _id field
    if (field === '_id') {
      continue;
    }

    const value = document[field];
    if(value.getTime) {
      const key = `${collectionName}:${field}:Date`;
      const time_ms = value.getTime();
      redisClient.zadd(key, time_ms, id);
      continue;
    }

    if (value._bsontype === 'Timestamp') {
      const key = `${collectionName}:${field}:Timestamp`;
      const time_ms = value.toNumber();
      redisClient.zadd(key, time_ms, id);
      continue;
    }

    if (typeof(value) === 'object') {
      let subObj = createChild(field, id, value);
      insertIndexs(redisClient, collectionName, subObj);
      continue;
    }

    if (isNaN(value)) {
      const key = `${collectionName}:${field}:${value}`;
      redisClient.sadd(key, id);
      continue;
    }

    const key = `${collectionName}:${field}`;
    redisClient.zadd(key, value, id);
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