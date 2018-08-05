import util from 'util';

export default async function find(wrapper, query, option) {
  if (!wrapper) {
    throw new Error('Missing wrapper client');
  }

  let selector = query || {};

  // Check special case where we are using an objectId
  if (selector._bsontype === 'ObjectID') {
    selector = {
      _id: selector
    };
  }

  // Ensure the query is an object
  if (selector != null && typeof selector !== 'object') {
    throw new Error('query must be an object');
  }

  const newOption = createNewOption(option);
  const findCommand = {
    collection: wrapper.collectionName || '',
    client: wrapper.client.redis || undefined,
    query: selector,
    option: newOption
  }
  // console.log(findCommand);
}

function createNewOption(option) {
  let newOption = Object.assign({}, option);
  newOption.limit = option.limit || 0;
  newOption.sort = option.sort || undefined;
  newOption.skip = option.skip || 0;
  return newOption;
}

async function findAll(client, collectionName) {
  let listDocument = [];
  const smembers = util.promisify(client.smembers).bind(client);
  const get = util.promisify(client.get).bind(client);
  const listKey = await smembers(collectionName);
  for (let key of listKey) {
    const stringDocument = await get(key);
    const document = JSON.parse(stringDocument);
    listDocument.push(document);
  }
  return listDocument;
}

//Find document by it _i
async function findById(client, id) {
  const document = await client.get(id);
  return document;
}



function and(client, query) {
  const listKey = [];
  for (let field in query) {
    const key = `${field}`
  }
  client.sinter()
}

function or(client, listKey) {

}

// rebuild JSON from string
async function get(idList) {
  let result = [];
  idList.forEach(async (id) => {
    const docString = await get(id);
    const document = Object.assign({
      _id: id
    }, JSON.parse(docString));
    documentList.push(document);
    // console.log(document);
  });
  get(id).then((result) => {
      document = Object.assign({
        _id: id
      }, JSON.parse(result));
      return document;
    })
    .catch((err) => {
      throw err;
    })
}

function getKeys(collection, query) {
  const listKey = [collection];
  for (let field in query) {
    const value = query[field];
    if (typeof(value) === typeof {}) {
      let subObj = createSubObject(field, id, value);
      insertIndex(redisClient, subObj);
    } else {
      const key = `${field}:${value}`;
      redisClient.sadd(key, id);
    }
  }
  return listKey;
}

//Create document from subObject of Document
function rebuildObject(bson) {
  const obj = JSON.parse(bson);
  obj.forEach((field) => {
    if (typeof obj[field] === 'string') {
      obj[field] = JSON.parse(obj[field]);
    }
  });
  return obj;
}