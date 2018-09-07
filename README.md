# Redis Wrapper

A wrapper uses Redis to cache query MongoDB.

## A little note about this

Many thank, Mr. Huan, Mr.Minh and all KMS friends that help me with this project. Thanks for your great help.

This project strategies base on [Amazon ElastiCache for Redis Guild](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Strategies.html) and all images from this article [Caching Strategies and How to Choose the Right One](https://codeahoy.com/2017/08/11/caching-strategies-and-how-to-choose-the-right-one/).

## Dependencies

This module requires these packages **redis**, **mongodb**, **bluebird**.

Suppose all code in this docs run async/await

## Lazy loading

Lazy loading strategies works best for read-heavy workloads when the same data is requested many times.

### I. How it works

Lazy loading is a caching strategy that loads data into the cache only when necessary. Whenever your application requests data, it first makes the request to the LazyWrapper cache. If the data exists in the cache and is current, LazyWrapper returns the data to your application. If the data does not exist in the cache, or the data in the cache has expired, your application requests the data from your data store which returns the data to your application. Your application then writes the data received from the store to the cache so it can be more quickly retrieved next time it is requested.
That data will be deleted after a period called expire. Have two cases can happen:

1. Cache hit:
   When data is in the cache and isn't expired

   Cache return data directly to the application.

2. Cache miss:
   When data isn’t in the cache or is expired

   Query executed on the main database (mongo). Then, data saved into the cache and return to the application.

![lazy-load image](./docs/images/lazy-load.png)

### II. How to use

`LazyWrapper` is a class that supports lazy caching data on find and findOne function.

1. Create `LazyWrapper` client

```javascript
const LazyWrapper = require('./index').LazyWrapper;
const MongoClient = require('mongodb').MongoClient;
const RedisClient = require('redis').RedisClient;

// Connection URL
const url = 'mongodb://localhost:27017';

// Database & Collection Name
const dbName = 'cache_db';
const collName = 'cache_coll';

// Expire time
const expire = 120;

// Connect to the server
const mongoClient = await createMongoClient(url);
const db = client.db(dbName);
const coll = db.collection(collName);
const redisClient = new RedisClient();

// Create wrapper for lazy cache
const lazyClient = new LazyWrapper(coll, redisClient, expire);
```

2. Find

`find()` and `findOne()` function work as same as native functions in mongodb, see [mongo's manual](https://docs.mongodb.com/manual/reference/method/db.collection.find/)
for advance usage

- Find all document

```javascript
const docs = await lazyClient.find();
```

- Find documents with a query filter

```javascript
const query = {
  $and: [
    { $or: [{ height: 0.99 }, { weight: 1.99 }] },
    { $or: [{ name: 'William' }, { weight: { $lt: 20 } }] }
  ]
};

const docs = await lazyClient.find(query);
```

## Inline cache

Inline cache sits in-line with the database. At first, it loads all data from the database to cache. After that, your application will only works on the cache. So, this can massively speed up application. Any change with the data will apply in the cache first and save to the main database later, it also updates the cache when database changed (coming later)

### I. How it works

InlineWrapper need call `init()` function first to load all MongoDB data to cache. It will separate all documents into a small bucket (hash), each bucket store 1000 documents, this way can optimize memory very efficiently. See this articles for further [Storing hundreds of millions of simple key-value pairs in Redis](https://instagram-engineering.com/storing-hundreds-of-millions-of-simple-key-value-pairs-in-redis-1091ae80f74c) and [Redis Memory optimization](https://redis.io/topics/memory-optimization). Each document's will has an inverted index base on its property (use for find with query filter).

### II. How to use

1. Create client

```javascript
const InlineWrapper = require('./index').InlineWrapper;
const MongoClient = require('mongodb').MongoClient;
const RedisClient = require('redis').RedisClient;

// Connection URL
const url = 'mongodb://localhost:27017';

// Database & Collection Name
const dbName = 'cache_db';
const collName = 'cache_coll';

// Expire time
const expire = 120;

// Connect to the server
const mongoClient = await createMongoClient(url);
const db = client.db(dbName);
const coll = db.collection(collName);
const redisClient = new RedisClient();

// Create wrapper for inline cache
const inlineClient = new InlineWrapper(coll, redisClient, expire);
```

2. Initial data

Load all data from the MongoDB database and store in cache. Took ~4.56Mb for

```javascript
await inlineClient.init();
```

3. Find

`find()` and `findOne()` function work as same as native functions in mongodb, see [mongo's manual](https://docs.mongodb.com/manual/reference/method/db.collection.find/)
for advance usage. Note: `option` parameter currently not availabe.

```javascript
const docs = await inlineClient.find();
```

More practice can be found at ./test
If you have any interest or question please feel free to contact me at thanhchi.fit.hcmus@gmail.com
