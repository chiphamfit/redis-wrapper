# redis-wrapper

Wrap mongo database with redis

## Dependencies

This module require these packages redis, mongodb, babel, util.

```npm install util redis mongodb nodemon --save```
```npm install babel-cli babel-preset-env --save-dev```

Add these to `package.json` file

 ```javascript
"scripts": {
    "start": "nodemon --exec babel-node --presets env index.js"
  },
"presets":
    ["env"]
```

Strore mongo's documents in string and use inverted index to store it 'field:value' for query

    Mongo data
        collection: collectionName
        document {
            _id: id,
            [field: value]
        }
    Redis data
        Document's data stored in string as id: {JSON.stringify(document)}
        Inverted index stored in set as
            {
                key: field:value
                value: [id,..]
            }
