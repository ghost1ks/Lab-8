// Інтеграційні тести (потрібна працююча БД). Запуск: npm test
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const db = require('../src/db');

let token;
const email = 'test' + Date.now() + '@test.com';

beforeAll(async () => {
  // міграція: створюємо таблиці, якщо їх ще немає
  await db.query(fs.readFileSync(path.join(__dirname, '../migrations/init.sql'), 'utf8'));
  const res = await request(app)
    .post('/api/register')
    .send({ name: 'Tester', email, password: '1234' });
  token = res.body.token;
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE email = $1', [email]); // замовлення видаляться каскадом
  await db.query("DELETE FROM products WHERE name = 'Для замовлення'");
  await db.end();
});

test('1. Реєстрація повертає токен, а логін з поганим паролем - 401', async () => {
  expect(token).toBeDefined();
  const res = await request(app).post('/api/login').send({ email, password: 'wrong' });
  expect(res.status).toBe(401);
});

test('2. GET /api/products повертає список з пагінацією', async () => {
  const res = await request(app).get('/api/products?limit=2');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.items)).toBe(true);
  expect(res.body.limit).toBe(2);
});

test('3. POST /api/products без токена - 401', async () => {
  const res = await request(app).post('/api/products').send({ name: 'X', price: 10 });
  expect(res.status).toBe(401);
});

test('4. CRUD товару: створити -> змінити -> видалити -> 404', async () => {
  const auth = { Authorization: 'Bearer ' + token };
  const created = await request(app).post('/api/products').set(auth).send({ name: 'Тест', price: 100, stock: 5 });
  expect(created.status).toBe(201);
  const id = created.body.id;

  const updated = await request(app).put('/api/products/' + id).set(auth).send({ name: 'Тест2', price: 150, stock: 5 });
  expect(updated.body.name).toBe('Тест2');

  const deleted = await request(app).delete('/api/products/' + id).set(auth);
  expect(deleted.status).toBe(204);
  const after = await request(app).get('/api/products/' + id);
  expect(after.status).toBe(404);
});

test('5. Замовлення зменшує склад, оплата ставить статус paid', async () => {
  const auth = { Authorization: 'Bearer ' + token };
  const product = (await request(app).post('/api/products').set(auth).send({ name: 'Для замовлення', price: 200, stock: 3 })).body;

  const order = await request(app).post('/api/orders').set(auth).send({ product_id: product.id, quantity: 2 });
  expect(order.status).toBe(201);
  expect(Number(order.body.total)).toBe(400);

  const tooMany = await request(app).post('/api/orders').set(auth).send({ product_id: product.id, quantity: 5 });
  expect(tooMany.status).toBe(400);

  const pay = await request(app).post('/api/payments').set(auth).send({ order_id: order.body.id, method: 'card' });
  expect(pay.status).toBe(201);
  const check = await request(app).get('/api/orders/' + order.body.id).set(auth);
  expect(check.body.status).toBe('paid');
});
