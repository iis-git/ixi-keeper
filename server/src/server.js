require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./db/models');
const app = express();
const port = process.env.PORT || 3020;

// Импортируем модели
const { User, Product, Order, OrderProduct } = require('./db/models');

// Добавляем CORS middleware для обработки запросов с клиента
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Обработчики для пользователей
app.post('/api/users', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await User.findByPk(id, {
      include: [{ model: Order, as: 'orders' }]
    });
    
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'Пользователь не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await User.update(req.body, {
      where: { id: id }
    });
    
    if (updated) {
      const updatedUser = await User.findByPk(id);
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'Пользователь не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await User.destroy({
      where: { id: id }
    });
    
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Пользователь не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Обработчики для товаров
app.post('/api/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const product = await Product.findByPk(id);
    
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Товар не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await Product.update(req.body, {
      where: { id: id }
    });
    
    if (updated) {
      const updatedProduct = await Product.findByPk(id);
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Товар не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await Product.destroy({
      where: { id: id }
    });
    
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Товар не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Обработчики для заказов
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, products, totalAmount, status } = req.body;
    
    // Создаем заказ
    const order = await Order.create({
      userId,
      totalAmount,
      status
    });
    
    // Добавляем товары к заказу
    if (products && products.length > 0) {
      const orderProducts = products.map(product => ({
        orderId: order.id,
        productId: product.id,
        quantity: product.quantity,
        price: product.price
      }));
      
      await OrderProduct.bulkCreate(orderProducts);
      
      // Обновляем статистику пользователя
      const user = await User.findByPk(userId);
      if (user) {
        const newTotalOrdersAmount = user.totalOrdersAmount + totalAmount;
        const newVisitCount = user.visitCount + 1;
        const newAverageCheck = newTotalOrdersAmount / newVisitCount;
        
        await user.update({
          totalOrdersAmount: newTotalOrdersAmount,
          visitCount: newVisitCount,
          averageCheck: newAverageCheck
        });
      }
    }
    
    // Возвращаем созданный заказ с товарами
    const createdOrder = await Order.findByPk(order.id, {
      include: [
        { model: User, as: 'user' },
        { model: Product, as: 'products' }
      ]
    });
    
    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: User, as: 'user' },
        { model: Product, as: 'products' }
      ]
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const order = await Order.findByPk(id, {
      include: [
        { model: User, as: 'user' },
        { model: Product, as: 'products' }
      ]
    });
    
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Заказ не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    const [updated] = await Order.update({ status }, {
      where: { id: id }
    });
    
    if (updated) {
      const updatedOrder = await Order.findByPk(id, {
        include: [
          { model: User, as: 'user' },
          { model: Product, as: 'products' }
        ]
      });
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Заказ не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Удаляем связанные записи в таблице order_products
    await OrderProduct.destroy({
      where: { orderId: id }
    });
    
    // Удаляем сам заказ
    const deleted = await Order.destroy({
      where: { id: id }
    });
    
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Заказ не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Главная страница
app.get('/', (req, res) => {
  res.send(`
    <h1>Welcome to Ixi-Keeper REST API</h1>
    <p>Use the following endpoints to interact with the database:</p>
    <h2>Users Table Endpoints:</h2>
    <ul>
      <li><strong>Create a User:</strong> POST /api/users</li>
      <li><strong>Get All Users:</strong> GET /api/users</li>
      <li><strong>Get a Specific User:</strong> GET /api/users/{id}</li>
      <li><strong>Update a User:</strong> PUT /api/users/{id}</li>
      <li><strong>Delete a User:</strong> DELETE /api/users/{id}</li>
    </ul>
    <h2>Products Table Endpoints:</h2>
    <ul>
      <li><strong>Create a Product:</strong> POST /api/products</li>
      <li><strong>Get All Products:</strong> GET /api/products</li>
      <li><strong>Get a Specific Product:</strong> GET /api/products/{id}</li>
      <li><strong>Update a Product:</strong> PUT /api/products/{id}</li>
      <li><strong>Delete a Product:</strong> DELETE /api/products/{id}</li>
    </ul>
    <h2>Orders Table Endpoints:</h2>
    <ul>
      <li><strong>Create an Order:</strong> POST /api/orders</li>
      <li><strong>Get All Orders:</strong> GET /api/orders</li>
      <li><strong>Get a Specific Order:</strong> GET /api/orders/{id}</li>
      <li><strong>Update an Order:</strong> PUT /api/orders/{id}</li>
      <li><strong>Delete an Order:</strong> DELETE /api/orders/{id}</li>
    </ul>
  `);
});

// Синхронизация с базой данных и запуск сервера
const startServer = async () => {
  try {
    // В режиме разработки можно использовать sync({ force: true }) для пересоздания таблиц
    // В продакшене лучше использовать миграции
    await sequelize.sync();
    console.log('База данных успешно синхронизирована');
    
    app.listen(port, () => {
      console.log(`Сервер запущен на порту ${port}`);
    });
  } catch (error) {
    console.error('Ошибка при синхронизации с базой данных:', error);
  }
};

startServer();
