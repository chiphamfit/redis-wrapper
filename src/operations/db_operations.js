/*
    Strore mongo's documents in string and use inverted index to store it field:value for query
    Mongo data
        collection: collectionName
        document {
            _id: id,
            [field: value]
        }
    Redis data
    - Document's data stored in string as id: {JSON.stringify(document)}
    - Inverted index stored in set as
        {
            key: field:value
            value: [id,..] //list of ids
        }
*/

export async function insertDocuments(redisClient, collectionName, listDocuments) {
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