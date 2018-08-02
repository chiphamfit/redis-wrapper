import util from 'util';

export async function find(wrapper, query, option) {
  const collectionName = wrapper.collectionName;
  const client = wrapper.redisClient;
  const _query = query || {};
  const _option = option || {};
  const query_number_args = Object.keys(query).length;
  const option_nunber_args = Object.keys(option).length;

  if (option_nunber_args === 0) {

  }

  if (query_number_args === 0 && option_nunber_args === 0) {
    return await findAll(client, collectionName);
  }

  //do some thing here when query or option is passed
  if (_query._id && _option === '{}') {
    return findById(query._id);
  }
}

async function findAll(client, collectionName) {
  let listDocument = [];
  const smembers = util.promisify(client.smembers).bind(client);
  const get = util.promisify(client.get).bind(client);
  const listKey = await smembers(collectionName);
  for (let key of listKey) {
    const stringDocument = await get(key);
    // error when parse nested JSON       
    const document = JSON.parse(stringDocument);
    listDocument.push(document);
  }
  return listDocument;
}

//Find document by it _i
export async function findById(client, id) {
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
    console.log(document);
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
function createSubObject(parent, id, document) {
  const subObj = {};
  for (let field in document) {
    let _field = `${parent}:${field}`;
    subObj[_field] = document[field];
  }
  subObj._id = id;
  return subObj;
}