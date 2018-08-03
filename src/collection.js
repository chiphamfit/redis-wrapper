import {
  find,
  findOne
} from './operations/find';
import wrapper from './wrapper_client';

export default class Collection {
  constructor(name, client) {
    
    if (typeof name !== 'string') {
            
    }
    this.name = name || '';

    this.client = client;
  }

  static collectionError(decription) {
    let error = new Error();
    error.name = 'CollectionError';
    error.message = decription || '';
  }
  async find(query = {}, option = {}) {
    return find(this, query, option);
  }

  async findOne() {

  }


}