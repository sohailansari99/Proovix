const { stopMongo } = require('./inMemoryMongoHelper');

async function teardown() {
  await stopMongo();
}

module.exports = teardown;
