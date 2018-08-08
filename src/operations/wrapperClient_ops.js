import mongodb from 'mongodb';
import redis from 'redis';
import {
  isEmpty,
  isMongoClient,
  isRedisClient
} from '../util/check'
import {
  mongo_url,
  mongo_parse_option
} from '../../config';

export async function connectMongoClient(mongoClient) {
  if (isEmpty(mongoClient)) {
    return await mongodb.connect(mongo_url, mongo_parse_option);
  } else {
    return await mongoClient;
  }
}

export async function connectRedisClient(redisClient) {
  redisClient = await (redisClient || redis.createClient());
  return redisClient;
}


export async function initialize(mongoClient, redisClient) {
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

    // store Date value in milisecond in zset
    if(value.getTime) {
     
      continue;
    }

    // store Timestamp in milisecon in zset
    if (value._bsontype === 'Timestamp') {
      const key = `${collectionName}.${field}.@Timestamp`;
      const time_ms = value.toNumber();
      redisClient.zadd(key, time_ms, id);
      continue;
    }

    // if value of field is object, create field's subObject
    // then insert subObject to index
    if (typeof value === 'object') {
      let subObj = createChild(field, id, value);
      insertIndexs(redisClient, collectionName, subObj);
      continue;
    }

    // store numberic values to zset
    if (isNaN(value)) {
      const key = `${collectionName}.${field}:${value}`;
      redisClient.sadd(key, id);
      continue;
    }

    // store orther type values in set of string 
    const key = `${collectionName}.${field}`;
    redisClient.zadd(key, value, id);
  }
}

function createChild(prefix, id, object) {
  const child = {};
  for (let field in object) {
    let _field = `${prefix}.${field}`;
    child[_field] = object[field];
  }
  if (!child._id) {
    child._id = id;
  }

  return child;
}