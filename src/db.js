import {
  createError
} from './error';
import {
  mongo_url,
  parserOption
} from '../config';

export async function connect(client) {
  if (!client) {
    throw createError('Wrapper Client', 'Invalid input');
  }
  let _mongoClient = client.mongoClient || mongodb.connect(mongo_url, parserOption);
  const _redisClient = await (client.redisClient || redis.createClient());
  if (_mongoClient.then) {
    _mongoClient = await _mongoClient.catch((err) => {
      throw createError('Wrapper Client', err.message);
    });
  }

  _redisClient.on('error', (err) => {
    throw createError('Wrapper Client', err.message);
  });

  return true;
}

export async function initialize(dbName, client) {
  if (!client.mongoClient) {
    throw createError('Wrapper Client', 'Invalid input: mongoClient is undefined');
  }

  if (!client.redisClient) {
    throw createError('Wrapper Client', 'Invalid input: redisClient is undefined');
  }
  
  dbName = dbName || '';
  const mongoDb = dbName !== '' ? client.mongoClient.db(dbName) : client.mongoClient.db();
  const listCollections = await mongoDb.listCollections().toArray();
  
  for (let i = 0, length = listCollections.length; i < length; i++) {
    const collection = listCollections[i];
    const cursor = await mongoDb.collection(collection.name).find();
    const listDocuments = await cursor.toArray();
    await insertDocuments(client.redisClient, collection.name, listDocuments);
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
      } else {
        const key = `${collectionName}:${field}:${value}`;
        redisClient.sadd(key, id);
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