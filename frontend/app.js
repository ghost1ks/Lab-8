// Клієнт: звичайний JavaScript + fetch
const API = '/api';
let token = localStorage.getItem('token');
let userName = localStorage.getItem('userName');
let page = 1;
const LIMIT = 5;
let editId = null; // id товару

// допоміжні функції 
function showMessage(text, isError) {
  const box = document.getElementById('message');
  box.textContent = text;
  box.className = isError ? 'err' : 'ok';
  box.style.display = 'block';
  setTimeout(() => (box.style.display = 'none'), 3000);
}

// Один виклик API: додає токен, повертає дані, а при помилці показує повідомлення
async function api(path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return true;
  const data = await res.json();
  if (!res.ok) {
    showMessage(data.error || 'Помилка', true);
    return null;
  }
  return data;
}

// вхід / реєстрація
function saveSession(data) {
  token = data.token;
  userName = data.user.name;
  localStorage.setItem('token', token);
  localStorage.setItem('userName', userName);
  showMessage('Вітаємо, ' + userName + '!');
  updateUI();
}

async function login() {
  const data = await api('/login', 'POST', {
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
  });
  if (data) saveSession(data);
}

async function register() {
  const data = await api('/register', 'POST', {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
  });
  if (data) saveSession(data);
}

function logout() {
  token = null;
  localStorage.clear();
  updateUI();
}

function updateUI() {
  const loggedIn = !!token;
  document.getElementById('authBox').style.display = loggedIn ? 'none' : 'block';
  document.querySelectorAll('.auth-only').forEach((el) => (el.style.display = loggedIn ? 'block' : 'none'));
  document.getElementById('userBox').innerHTML = loggedIn
    ? userName + ' <button class="gray" onclick="logout()">Вийти</button>'
    : '';
  loadProducts();
  if (loggedIn) loadOrders();
}

// товари 
async function loadProducts() {
  const search = document.getElementById('search').value;
  const data = await api(`/products?search=${encodeURIComponent(search)}&page=${page}&limit=${LIMIT}`);
  if (!data) return;

  const rows = data.items.map((p) => `
    <tr>
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>${p.description || ''}</td>
      <td>${p.price}</td>
      <td>${p.stock}</td>
      <td>${token ? `
        <button onclick="buy(${p.id})">Купити</button>
        <button class="gray" onclick='editProduct(${JSON.stringify(p)})'>Ред.</button>
        <button class="red" onclick="deleteProduct(${p.id})">✕</button>` : ''}
      </td>
    </tr>`);
  document.getElementById('productsTable').innerHTML = rows.join('');
  const pages = Math.max(Math.ceil(data.total / LIMIT), 1);
  document.getElementById('pageInfo').textContent = `Сторінка ${data.page} з ${pages}`;
  document.getElementById('pageInfo').dataset.pages = pages;
}

function changePage(delta) {
  const pages = Number(document.getElementById('pageInfo').dataset.pages);
  const newPage = page + delta;
  if (newPage < 1 || newPage > pages) return;
  page = newPage;
  loadProducts();
}

function editProduct(p) {
  editId = p.id;
  document.getElementById('formTitle').textContent = 'Редагувати товар #' + p.id;
  document.getElementById('pName').value = p.name;
  document.getElementById('pDesc').value = p.description || '';
  document.getElementById('pPrice').value = p.price;
  document.getElementById('pStock').value = p.stock;
}

function resetForm() {
  editId = null;
  document.getElementById('formTitle').textContent = 'Додати товар';
  ['pName', 'pDesc', 'pPrice', 'pStock'].forEach((id) => (document.getElementById(id).value = ''));
}

async function saveProduct() {
  const body = {
    name: document.getElementById('pName').value,
    description: document.getElementById('pDesc').value,
    price: Number(document.getElementById('pPrice').value),
    stock: Number(document.getElementById('pStock').value),
  };
  const data = editId ? await api('/products/' + editId, 'PUT', body) : await api('/products', 'POST', body);
  if (data) {
    showMessage(editId ? 'Товар оновлено' : 'Товар додано');
    resetForm();
    loadProducts();
  }
}

async function deleteProduct(id) {
  if (!confirm('Видалити товар?')) return;
  if (await api('/products/' + id, 'DELETE')) {
    showMessage('Товар видалено');
    loadProducts();
  }
}

// замовлення 
async function buy(productId) {
  const quantity = Number(prompt('Скільки штук?', '1'));
  if (!quantity) return;
  if (await api('/orders', 'POST', { product_id: productId, quantity })) {
    showMessage('Замовлення створено');
    loadProducts();
    loadOrders();
  }
}

async function loadOrders() {
  const status = document.getElementById('statusFilter').value;
  const orders = await api('/orders' + (status ? '?status=' + status : ''));
  if (!orders) return;
  document.getElementById('ordersTable').innerHTML = orders.map((o) => `
    <tr>
      <td>${o.id}</td>
      <td>${o.product_name}</td>
      <td>${o.quantity}</td>
      <td>${o.total}</td>
      <td>${o.status}</td>
      <td>
        ${o.status === 'new' ? `<button onclick="pay(${o.id})">Оплатити</button>` : ''}
        <button class="red" onclick="deleteOrder(${o.id})">✕</button>
      </td>
    </tr>`).join('');
}

async function pay(orderId) {
  if (await api('/payments', 'POST', { order_id: orderId, method: 'card' })) {
    showMessage('Оплачено карткою');
    loadOrders();
  }
}

async function deleteOrder(id) {
  if (!confirm('Видалити замовлення?')) return;
  if (await api('/orders/' + id, 'DELETE')) {
    loadOrders();
    loadProducts();
  }
}

updateUI();
