const mongoose = require('mongoose');
const { getMongod } = require('./inMemoryMongoHelper');

// Connect to the in-memory MongoDB instance
const connectDB = async () => {
  const uri = getMongod().getUri();
  await mongoose.connect(uri);
  console.log('[test-db] Connected to in-memory MongoDB');
};

// Clean up collections before each test
beforeAll(async () => {
  await connectDB();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  console.log('[test-db] Disconnected from in-memory MongoDB\n');
});
