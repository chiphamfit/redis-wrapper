export async function createWrapperClient(mongoClient = {}, redisClient = {}) {
  if (redisClient.on) {
    redisClient.on('error', (err) => {
      throw err;
    })
  }

  const has = mongoClient.hasOwnProperty;
  if (!(mongoClient.then || has('db'))) {
    throw new Error('mongoClient must be connected first')
  }

  // Get data from mongodb
  const _mongoClient = await mongoClient.catch((err) => {
    throw err;
  });
  const client = {
    mongo: _mongoClient,
    redis: redisClient
  }
  return client;
}

/*
    Strore mongo's documents in string and use inverted index to store it field:value for query
    Mongo data
        collection: collectionName
        document {
            _id: id,
            [field: value]
        }
    Redis Data
    - Document's data stored in string as id: {JSON.stringify(document)}
    - Inverted index stored in set as
        {
            key: field:value
            value: [id,..] //list of id has same value
        }
*/
export async function initializeDatabase(client) {
  if (!client || !client.mongo || !client.redis) {
    throw new Error('Missing client');
  }

  const mongoDb = client.mongo.db();
  const listCollections = await mongoDb.listCollections().toArray();
  listCollections.forEach(async (collection) => {
    const listDocuments = await mongoDb.collection(collection.name).find().toArray();
    insertDocuments(client.redis, collection.name, listDocuments);
  });
}

async function insertDocuments(redisClient, collectionName, listDocuments) {
  listDocuments.forEach(async (document) => {
    const key = `${document._id}`;
    await redisClient.set(key, JSON.stringify(document));
    // insert collection index
    await insertIndexs(redisClient, collectionName, document);
  })
}

// insert inverted index of doccument into redis
function insertIndexs(redisClient, collectionName, document) {
  const id = `${document._id}`;
  for (let field in document) {
    if (field != '_id') {
      const value = document[field];
      if (typeof(value) === typeof {}) {
        let subObj = createChild(field, id, value);
        insertIndexs(redisClient, collectionName, subObj);
      } else {
        const key = `${collectionName}:${field}:${value}`;
        redisClient.sadd(key, id);
      }
    }
  }
}

//Create child from object
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