import util from 'util';
import {
  isEmpty
} from '../util/check';

export async function find(collection, query, option) {
  let selector = query || {};
  // Check special case where we are using an objectId
  if (selector._bsontype === 'ObjectID') {
    selector = {
      _id: selector
    };
  }

  // create new option object
  let newOption = Object.assign({}, option);
  newOption.limit = option.limit || 0;
  newOption.sort = option.sort || undefined;
  newOption.skip = option.skip || 0;
  // create find command for query data
  const findCommand = {
    collectionName: collection.name || '',
    client: collection.redisClient,
    query: selector,
    option: newOption
  }

  return await execFindCommand(findCommand);
}

export async function findOne(collection, query, option) {
  if (isEmpty(option)) {
    option = {
      limit: 1
    }
  } else {
    option.limit = 1;
  }

  const cursor = await find(collection, query, option);
  return cursor[0] || null;
}

async function execFindCommand(findCommand) {
  // unpack findCommand data
  const redisClient = findCommand.client;
  const collectionName = findCommand.collectionName;
  const query = findCommand.query;
  const option = findCommand.option;

  if (isEmpty(query)) {
    return await findAll(collectionName, redisClient, option);
  }

  if (query._id) {
    return await findById(query._id, collectionName, redisClient);
  }

  let queryStack = [];
  for (let object in query) {
    // if ()
  }
}

async function findAll(collectionName, redisClient, option) {
  // unpack option
  const limit = option.limit;
  const skip = option.skip;
  const sort = option.sort;

  const hashScan = util.promisify(redisClient.hscan).bind(redisClient);
  let nextCursor = 0;
  let cursor = [];

  // scaning documents in collection
  do {
    const scanResult = await hashScan(collectionName, nextCursor, 'COUNT', skip + limit || 10);
    nextCursor = scanResult[0];
    const listDocument = scanResult[1];

    for (let i = 1, length = listDocument.length; i < length; i += 2) {
      const document = JSON.parse(listDocument[i]);
      cursor.push(document);
    }
  } while (nextCursor != 0 && (cursor.length < limit + skip || limit === 0));

  // apply option to cursor
  if (skip || limit) {
    cursor = cursor.slice(skip, limit + skip);
  }

  cursor = sortList(cursor, sort);
  return cursor;
}

// Find document by it _id
async function findById(id, collectionName, redisClient) {
  // find documents by scan it id in hash
  id = `${id}`;
  const hashGet = util.promisify(redisClient.hget).bind(redisClient);
  const result = await hashGet(collectionName, id);
  const cursor = [JSON.parse(result)] || [];
  return cursor;
}

export function sortList(list, option) {
  for (let field in option) {
    list = list.sort(predicateBy(field, option[field]));
  }

  return list;
}

function predicateBy(property, mode) {
  return (a, b) => {
    if (a[property] > b[property]) {
      return 1 * mode;
    } else if (a[property] < b[property]) {
      return -1 * mode;
    }

    return 0;
  }
}
// export function createKey(query, collectionName) {
//   for (let field in query) {
//     //ignore _id field
//     if (field === '_id') {

//     }

//     const value = query[field];

//     // store Date value in milisecond in zset
//     if(value.getTime) {
//       const key = `${collectionName}:${field}:Date`;
//       const time_ms = value.getTime();
//       listKey.push(key + time_ms);
//       continue;
//     }

//     // store Timestamp in milisecon in zset
//     if (value._bsontype === 'Timestamp') {
//       const key = `${collectionName}:${field}:Timestamp`;
//       const time_ms = value.toNumber();
//       listKey.push(key + time_ms);
//       continue;
//     }

//     // if value of field is object, create field's subObject
//     // then insert subObject to index
//     if (typeof value === 'object') {
//       let subObj = createChild(field, value);
//       const newKey = createKey(subObj, collectionName);
//       listKey.push(newKey);
//       continue;
//     }

//     // store numberic values to zset
//     if (isNaN(value)) {
//       const key = `${collectionName}:${field}:${value}`;
//       listKey.push(key);
//       continue;
//     }

//     // store orther type values in set of string 
//     const key = `${collectionName}:${field}`;
//     listKey.push(key + value);
//   }

//   return listKey;
// }

// function createChild(prefix, object) {
//   const child = {};
//   for (let field in object) {
//     let _field = `${prefix}:${field}`;
//     child[_field] = object[field];
//   }

//   return child;
// }