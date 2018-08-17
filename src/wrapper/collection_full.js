// ihirite from Collection
class CollectionFull {
  // // scan in redis fisrt
  // let listId = await this.redisWrapper.search(key, 'set');
  // // if found, parse result back to JSON
  // if (listId.length > 0) {
  //   // find documents by it Id
  //   await listId.forEach(async id => {
  //     try {
  //       const doc = await this.redisWrapper.search(id, 'string');
  //       listDocuments.push(JSON.parse(doc));
  //     } catch (error) {
  //       throw error;
  //     }

  //     return listDocuments;
  //   });
  // }
  // // if can't found in cache, try to find in mongodb
  // cursor = await super.find(query, option);
  // listDocuments = await cursor.toArray();
  // // save result into cache 
  // if (listDocuments.length > 0) {
  //   listId = [];
  //   listDocuments.map(doc => {
  //     const id = JSON.stringify(doc._id);
  //     listId.push(id);
  //     this.redisWrapper.save(id, doc, 'string', this.expire);
  //   });

  //   await this.redisWrapper.save(key, listId, 'set', this.expire);
  // }

}

module.exports = CollectionFull;