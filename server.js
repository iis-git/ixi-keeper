const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

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

// Sample in-memory database (replace with actual database in production)
const database = {
  users: [
    { id: 0, name: "Sample User", phone: "+1234567890", totalOrdersAmount: 0, visitCount: 0, averageCheck: 0 }
  ],
  products: [],
  orders: []
};

// Generic function to handle CRUD operations

function handleCRUD(tableName) {
  return {
    // Create
    create: (req, res) => {
      const newItem = req.body;
      database[tableName].push(newItem);
      res.status(201).json(newItem);
    },
    // Read all
    readAll: (req, res) => {
      res.json(database[tableName]);
    },
    // Read one
    readOne: (req, res) => {
      const id = parseInt(req.params.id);
      const item = database[tableName].find((i, index) => index === id);
      if (item) {
        res.json(item);
      } else {
        res.status(404).json({ message: 'Item not found' });
      }
    },
    // Update
    update: (req, res) => {
      const id = parseInt(req.params.id);
      const itemIndex = database[tableName].findIndex((i, index) => index === id);
      if (itemIndex !== -1) {
        database[tableName][itemIndex] = { ...database[tableName][itemIndex], ...req.body };
        res.json(database[tableName][itemIndex]);
      } else {
        res.status(404).json({ message: 'Item not found' });
      }
    },
    // Delete
    delete: (req, res) => {
      const id = parseInt(req.params.id);
      const itemIndex = database[tableName].findIndex((i, index) => index === id);
      if (itemIndex !== -1) {
        database[tableName].splice(itemIndex, 1);
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Item not found' });
      }
    }
  };
}

// Define routes for each table
const tables = ['users', 'products', 'orders'];
tables.forEach(table => {
  const crud = handleCRUD(table);
  app.post(`/api/${table}`, crud.create);
  app.get(`/api/${table}`, crud.readAll);
  app.get(`/api/${table}/:id`, crud.readOne);
  app.put(`/api/${table}/:id`, crud.update);
  app.delete(`/api/${table}/:id`, crud.delete);
});

// Start the server
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
  `);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
