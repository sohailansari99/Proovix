require("dotenv").config();

const app = require("./app");
const connectDatabase = require("./config/database");
const env = require("./config/env");

// Refuse to start in production if any stub flags are enabled
if (env.nodeEnv === "production") {
  const stubFlags = Object.keys(process.env).filter(k => k.startsWith("STUB_"));
  if (stubFlags.length > 0) {
    console.error(`FATAL: Cannot run in production with STUB flags: ${stubFlags.join(", ")}`);
    process.exit(1);
  }
}

const startServer = async () => {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`Proovix API running on port ${env.port}`);
  });
};

startServer();