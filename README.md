# Redis Wrapper

A wrapper use redis to cache mongo database.

## Introdution

## Dependencies

This module require these packages *redis*, *mongodb*, *util*

## How to use

### Init

### Connect

### Query

<!-- ## Data struct

Strore mongo's documents in string and use inverted index to store it 'field:value' for query

Mongo data

        collection: collectionName
        document {
            _id: id,
            [field: value]
        }

Redis data
  Document's data stored in hash:

        key: collectionName
        {
                field: _id
                value: stringify of document
        }

Inverted index stored in set as 2 type set and sorted set (zset)

        zset store Date, Timestamp, numberic data type
            {
                key: field
                field: value
                value: _id
            }

        set store the order
            {
                key: field:value
                value: [id,..]
            } -->
