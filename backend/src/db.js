// Підключення до PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://shop:shop@localhost:5432/shop',
});

module.exports = pool;
