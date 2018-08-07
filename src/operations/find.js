import util from 'util';
import { sortList } from './sort';
import {
  isEmpty,
  isMongoClient,
  isRedisClient,
  isValidString
} from './checker';

export default async function find(collection, query, option) {
  if (isEmpty(collection)) {
    throw new Error('collection is empty');
  }

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

async function execFindCommand(findCommand) {
  if (isEmpty(findCommand)) {
    throw new Error('findCommand is empty');
  }

  // unpack findCommand data
  const redisClient = findCommand.client;
  const collectionName = findCommand.collectionName || '';
  const query = findCommand.query || {};
  const option = findCommand.option || {};

  if (isEmpty(query)) {
    return await findAll(collectionName, redisClient, option);
  }

  if (query._id) {
    return await findById(query._id, collectionName, redisClient);
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
    const scanResult = await hashScan(collectionName, nextCursor, 'COUNT', limit || 10);
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
  id = `${id}`;
  if (!isValidString(id)) {
    throw new Error('id is invalid string');
  }

  // find documents by scan it id in hash
  const hashGet = util.promisify(redisClient.hget).bind(redisClient);
  const result = await hashGet(collectionName, id);
  const cursor = [JSON.parse(result)] || [];
  return cursor;
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