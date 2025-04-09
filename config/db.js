const mysql = require("mysql2/promise");
const dbConfig = require("./db.config");

// ✅ Create Single MySQL Connection Pool
const userDBPool = mysql.createPool({
  host: dbConfig.HOST,
  user: dbConfig.USER,
  password: dbConfig.PASSWORD,
  database: dbConfig.USER_DB_NAME, // You’ll use this DB for everything
  port: dbConfig.PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ✅ Check MySQL Connection
const checkDBConnection = async () => {
  try {
    const conn = await userDBPool.getConnection();
    console.log("✅ MySQL DB connected successfully!");
    conn.release();
  } catch (error) {
    console.error("❌ MySQL Database connection failed:", error.message);
  }
};

// Run check
checkDBConnection();

// ✅ Export the single pool
module.exports = { userDBPool };
