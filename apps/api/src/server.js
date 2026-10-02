require("dotenv").config();

const app = require("./app");
const connectDatabase = require("./config/database");
const env = require("./config/env");

const startServer = async () => {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`Proovix API running on port ${env.port}`);
  });
};

startServer();