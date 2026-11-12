const { MongoMemoryServer } = require('mongodb-memory-server');

let mongodInstance = null;

async function startMongo() {
  if (!mongodInstance) {
    mongodInstance = await MongoMemoryServer.create();
    console.log(`[in-memory-mongodb] started at ${mongodInstance.getUri()}`);
  }
  return mongodInstance;
}

function getMongod() {
  if (!mongodInstance) {
    throw new Error('MongoMemoryServer not started. Call startMongo() first.');
  }
  return mongodInstance;
}

async function stopMongo() {
  if (mongodInstance) {
    await mongodInstance.stop();
    mongodInstance = null;
    console.log('[in-memory-mongodb] stopped');
  }
}

module.exports = { startMongo, getMongod, stopMongo };
