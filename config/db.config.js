require("dotenv").config({ path: __dirname + "/../.env" });

const dbConfig = {
  HOST: process.env.DB_HOST,
  USER: process.env.DB_USER,
  PASSWORD: process.env.DB_PASSWORD,
  PORT: process.env.DB_PORT || 3306,
  DIALECT: process.env.DB_DIALECT || "mysql",

  // Separate Databases
  USER_DB_NAME: process.env.USER_DB_NAME, // User-related DB
  POLL_DB_NAME: process.env.POLL_DB_NAME, // Poll-related DB

  pool: {
    max: 10, // Increased pool size
    min: 0,
    acquire: process.env.DB_POOL_ACQUIRE || 30000, // 30 sec
    idle: process.env.DB_POOL_IDLE || 10000, // 10 sec
  },
};


module.exports = dbConfig;
