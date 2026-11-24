// Налаштування Express-застосунку (без запуску сервера - так зручно тестувати)
require('express-async-errors'); // щоб помилки в async-маршрутах ловились
const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const app = express();
app.use(cors());
app.use(express.json());

// Swagger UI: http://localhost:3000/api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(require('./swagger.json')));

// API
app.use('/api', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/users', require('./routes/users'));

// Фронтенд (звичайні статичні файли)
const frontendDir = process.env.FRONTEND_DIR || path.join(__dirname, '../../frontend');
app.use(express.static(frontendDir));

// 404 для невідомих API-маршрутів
app.use('/api', (req, res) => res.status(404).json({ error: 'Маршрут не знайдено' }));

// 500 - будь-яка неочікувана помилка
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Помилка сервера' });
});

module.exports = app;
