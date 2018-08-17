const crypto = require('crypto');
const CollectionWrapper = require('./collection');

class CollectionLazy extends CollectionWrapper {
  async find(query = {}, option = {}) {
    let cursor = [];
    let listDocuments = [];

    // Check special case where we are using an objectId
    if (query._bsontype === 'ObjectID') {
      query = {
        _id: query
      };
    }

    // create key for search/save
    const dbName = this.s.dbName;
    const collectionName = this.s.name;
    const _query = JSON.stringify(query);
    const _option = JSON.stringify(option);
    const key = crypto.createHash('md5')
      .update(dbName)
      .update(collectionName)
      .update(_query)
      .update(_option)
      .digest('hex');

    // scan in redis fisrt
    let listId = await this.redisWrapper.search(key, 'set');
    // if found, parse result back to JSON
    if (listId.length > 0) {
      // find documents by it Id
      await listId.forEach(async id => {
        try {
          const doc = await this.redisWrapper.search(id, 'string');
          listDocuments.push(JSON.parse(doc));
        } catch (error) {
          throw error;
        }

        return listDocuments;
      });
    }
    // if can't found in cache, try to find in mongodb
    cursor = await super.find(query, option);
    listDocuments = await cursor.toArray();
    // save result into cache 
    if (listDocuments.length > 0) {
      listId = [];
      listDocuments.map(doc => {
        const id = JSON.stringify(doc._id);
        listId.push(id);
        this.redisWrapper.save(id, doc, 'string', this.expire);
      });

      await this.redisWrapper.save(key, listId, 'set', this.expire);
    }

    return listDocuments;
  }

  async findOne(query = {}, option = {}) {
    // Check query, option
    const cursor = await this.find(query, option);
    const result = cursor[0] || null;
    return result;
  }
}

module.exports = CollectionLazy;