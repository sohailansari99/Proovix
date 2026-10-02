require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL,
  mongoUri: process.env.MONGO_URI,
};

module.exports = env;