import Wrapper from './wrapper';
import {
  createError
} from './error';
import {
  mongo_url,
  parserOption
} from '../config';

export default async function connect(mongoClient, redisClient, option) {
  let _mongoClient = mongoClient || mongodb.connect(mongo_url, parserOption);
  const _redisClient = await (redisClient || redis.createClient());
  if (_mongoClient.then) {
    _mongoClient = await _mongoClient.catch((err) => {
      throw createError('Wrapper Client', err.message);
    });
  }

  _redisClient.on('error', (err) => {
    throw createError('Wrapper Client', err.message);
  });

  const client = {
    mongoClient: _mongoClient,
    redisClient: _redisClient
  };

  const isInit = option.init || false;
  const dbName = option.dbName || '';

  if (isInit) {
    return await initialize(dbName, client);
  }

  return new Wrapper(client);
}

export default async function initialize(dbName, client) {
  if (!client.mongoClient) {
    throw createError('Invalid input: mongoClient is undefined');
  }

  if (!client.redisClient) {
    throw createError('Invalid input: redisClient is undefined');
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

  return new Wrapper(client, dbName);
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