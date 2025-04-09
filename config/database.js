require("dotenv").config({ path: __dirname + "/../.env" });

const { Sequelize } = require("sequelize");


// **Database Configuration**
const dbConfig = {
  HOST: process.env.DB_HOST,
  USER: process.env.DB_USER,
  PASSWORD: process.env.DB_PASSWORD,
  PORT: process.env.DB_PORT,
  DIALECT: process.env.DB_DIALECT || "mysql",

  // **Databases**
  USER_DB_NAME: process.env.USER_DB_NAME, // User-related DB
  POLL_DB_NAME: process.env.POLL_DB_NAME, // Poll-related DB

  pool: {
    max: 5,
    min: 0,
    acquire: process.env.DB_POOL_ACQUIRE || 30000,
    idle: process.env.DB_POOL_IDLE || 10000,
  },
  define: {
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  },
};

// **Sequelize Instances for Both Databases**
const userDB = new Sequelize(dbConfig.USER_DB_NAME, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.DIALECT,
  port: dbConfig.PORT,
  logging: console.log, // Enable logging for debugging
  define: {
    freezeTableName: true,
    timestamps: true,
    createdAt: "creationDate",
    updatedAt: "updateDate",
  },
  pool: dbConfig.pool,
});

const pollDB = new Sequelize(dbConfig.POLL_DB_NAME, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.DIALECT,
  port: dbConfig.PORT,
  logging: console.log, // Enable logging for debugging
  define: {
    freezeTableName: true,
    timestamps: true,
    createdAt: "creationDate",
    updatedAt: "updateDate",
  },
  pool: dbConfig.pool,
});

// **Check Database Connection**
const checkDatabaseConnection = async () => {
  try {
    await userDB.authenticate();
    console.log("✅ UserDB connected successfully!");

    await pollDB.authenticate();
    console.log("✅ PollDB connected successfully!");

    // **Sync Models**
    await userDB.sync({ force: false });
    await pollDB.sync({ force: false });

    console.log("✅ All models synchronized successfully!");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
};

// **Call the function to check connection**
checkDatabaseConnection();

module.exports = { userDB, pollDB };
