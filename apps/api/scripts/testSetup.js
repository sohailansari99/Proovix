const { startMongo, getMongod } = require('./inMemoryMongoHelper');

async function setup() {
  const mongod = await startMongo();
  process.env.MONGO_URI = mongod.getUri();
}

module.exports = setup;
