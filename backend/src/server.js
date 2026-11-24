// Запуск: створює таблиці (міграція), додає початкові дані, стартує сервер
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');
const app = require('./app');

async function migrate() {
  const dir = path.join(__dirname, '../migrations');
  await db.query(fs.readFileSync(path.join(dir, 'init.sql'), 'utf8'));

  // seed: тільки якщо товарів ще немає
  const count = await db.query('SELECT COUNT(*) FROM products');
  if (Number(count.rows[0].count) === 0) {
    await db.query(fs.readFileSync(path.join(dir, 'seed.sql'), 'utf8'));
    const hash = await bcrypt.hash('demo1234', 8);
    await db.query(
      "INSERT INTO users (name, email, password_hash) VALUES ('Demo User', 'demo@shop.com', $1) ON CONFLICT DO NOTHING",
      [hash]
    );
    console.log('Додано початкові дані (demo@shop.com / demo1234)');
  }
}

async function start() {
  // БД у Docker може стартувати трохи довше - пробуємо кілька разів
  for (let i = 1; i <= 10; i++) {
    try {
      await migrate();
      break;
    } catch (e) {
      console.log(`Чекаємо на БД (${i}/10): ${e.message}`);
      if (i === 10) process.exit(1);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Сервер: http://localhost:${port}`));
}

start();
