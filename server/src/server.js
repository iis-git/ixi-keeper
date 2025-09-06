require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./db/models');
const app = express();
const port = process.env.PORT || 3020;

// Импортируем модели
const { User, Product, Category, Order, UserProductStats, ProductStatistics, ProductIngredient, WriteOff } = require('./db/models');
const { Op } = require('sequelize');

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

// Обеспечиваем парсинг тела запросов до объявления маршрутов списаний
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Списания товаров для заказа
app.get('/api/orders/:id/write-offs', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const writeOffs = await WriteOff.findAll({
      where: { orderId },
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'unit'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(writeOffs);
  } catch (error) {
    console.error('Error fetching write-offs:', error);
    res.status(500).json({ message: 'Не удалось получить списания' });
  }
});

app.post('/api/orders/:id/write-offs', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { productId, quantity, reason } = req.body;

    if (!productId || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ message: 'Некорректные данные списания' });
    }

    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ message: 'Заказ не найден' });
    if (order.status !== 'active') return res.status(400).json({ message: 'Списание доступно только для активных заказов' });

    const product = await Product.findByPk(productId, {
      include: [
        {
          model: ProductIngredient,
          as: 'ingredients',
          include: [{ model: Product, as: 'ingredientProduct' }]
        }
      ]
    });
    if (!product) return res.status(404).json({ message: 'Товар не найден' });

    // Обновляем склад
    const qty = parseFloat(quantity);
    if (product.isComposite && product.ingredients && Array.isArray(product.ingredients)) {
      for (const ingredient of product.ingredients) {
        const stockChange = qty * ingredient.quantity; // списываем ингредиенты
        await ingredient.ingredientProduct.update({ stock: parseFloat(ingredient.ingredientProduct.stock) - stockChange });
      }
    } else {
      const stockChange = qty * parseFloat(product.unitSize || 1);
      await product.update({ stock: parseFloat(product.stock) - stockChange });
    }

    const writeOff = await WriteOff.create({ orderId, productId, quantity: qty, reason });

    const created = await WriteOff.findByPk(writeOff.id, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'unit'] }]
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating write-off:', error);
    res.status(500).json({ message: 'Не удалось создать списание' });
  }
});

// Middleware (дубликат на случай переноса кода; оставлено для совместимости)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Функция для расчета доступных порций составного товара
function calculateAvailablePortions(ingredients) {
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return 0;
  }
  
  let minPortions = Infinity;
  
  for (const ingredient of ingredients) {
    const availablePortions = Math.floor(ingredient.ingredientProduct.stock / ingredient.quantity);
    minPortions = Math.min(minPortions, availablePortions);
  }
  
  return minPortions === Infinity ? 0 : minPortions;
}

// Функция для обновления статистики пользователя
async function updateUserStatistics(userId, orderAmount) {
  try {
    const user = await User.findByPk(userId);
    if (!user) return;

    // Принудительно преобразуем в числа для корректного сложения
    const currentTotal = parseFloat(user.totalOrdersAmount) || 0;
    const currentVisits = parseInt(user.visitCount) || 0;
    const amount = parseFloat(orderAmount) || 0;

    const newVisitCount = currentVisits + 1;
    const newTotalAmount = currentTotal + amount;
    const newAverageCheck = newTotalAmount / newVisitCount;

    await user.update({
      visitCount: newVisitCount,
      totalOrdersAmount: newTotalAmount,
      averageCheck: newAverageCheck
    });

    console.log(`Updated user ${userId} statistics: visits=${newVisitCount}, total=${newTotalAmount}, avg=${newAverageCheck}`);
    console.log(`Debug: currentTotal=${currentTotal}, amount=${amount}, result=${newTotalAmount}`);
  } catch (error) {
    console.error('Error updating user statistics:', error);
  }
}

// Функция для обновления статистики товаров пользователя
async function updateUserProductStatistics(userId, orderItems) {
  try {
    for (const item of orderItems) {
      const { productId, productName, quantity, price } = item;
      
      // Получаем себестоимость товара
      const product = await Product.findByPk(productId);
      const costPrice = product ? parseFloat(product.costPrice) : 0;
      const totalCostAmount = parseFloat(quantity) * costPrice;
      
      // Обновляем статистику пользователя
      const [userStats, userCreated] = await UserProductStats.findOrCreate({
        where: { userId, productId },
        defaults: {
          productName,
          totalQuantity: quantity,
          totalAmount: quantity * price,
          totalCostAmount: totalCostAmount,
          orderCount: 1,
          lastOrderDate: new Date()
        }
      });

      if (!userCreated) {
        await userStats.update({
          productName,
          totalQuantity: parseFloat(userStats.totalQuantity) + parseFloat(quantity),
          totalAmount: parseFloat(userStats.totalAmount) + (parseFloat(quantity) * parseFloat(price)),
          totalCostAmount: parseFloat(userStats.totalCostAmount) + totalCostAmount,
          orderCount: userStats.orderCount + 1,
          lastOrderDate: new Date()
        });
      }

      // Обновляем общую статистику товаров
      const [productStats, productCreated] = await ProductStatistics.findOrCreate({
        where: { productId },
        defaults: {
          productName,
          totalQuantity: quantity,
          totalAmount: quantity * price,
          totalCostAmount: totalCostAmount,
          orderCount: 1,
          lastOrderDate: new Date()
        }
      });

      if (!productCreated) {
        await productStats.update({
          productName,
          totalQuantity: parseFloat(productStats.totalQuantity) + parseFloat(quantity),
          totalAmount: parseFloat(productStats.totalAmount) + (parseFloat(quantity) * parseFloat(price)),
          totalCostAmount: parseFloat(productStats.totalCostAmount) + totalCostAmount,
          orderCount: productStats.orderCount + 1,
          lastOrderDate: new Date()
        });
      }
    }

    console.log(`Updated product statistics for user ${userId}`);
  } catch (error) {
    console.error('Error updating user product statistics:', error);
  }
}

// Функция для управления остатками при изменении заказа
async function updateStockForOrderChange(oldItems, newItems) {
  console.log('Updating stock for order change:', { oldItems, newItems });
  
  // Создаем карты для сравнения количеств
  const oldQuantities = {};
  const newQuantities = {};
  
  // Заполняем карту старых количеств
  oldItems.forEach(item => {
    oldQuantities[item.productId] = (oldQuantities[item.productId] || 0) + item.quantity;
  });
  
  // Заполняем карту новых количеств
  newItems.forEach(item => {
    newQuantities[item.productId] = (newQuantities[item.productId] || 0) + item.quantity;
  });
  
  // Получаем все уникальные productId
  const allProductIds = new Set([...Object.keys(oldQuantities), ...Object.keys(newQuantities)]);
  
  for (const productId of allProductIds) {
    const oldQty = oldQuantities[productId] || 0;
    const newQty = newQuantities[productId] || 0;
    const difference = newQty - oldQty; // положительное = нужно списать, отрицательное = нужно вернуть
    
    if (difference !== 0) {
      console.log(`Product ${productId}: old=${oldQty}, new=${newQty}, diff=${difference}`);
      
      // Получаем информацию о товаре
      const product = await Product.findByPk(productId, {
        include: [
          {
            model: ProductIngredient,
            as: 'ingredients',
            include: [{ model: Product, as: 'ingredientProduct' }]
          }
        ]
      });
      
      if (!product) {
        console.error(`Product ${productId} not found`);
        continue;
      }
      
      if (product.isComposite && product.ingredients && Array.isArray(product.ingredients)) {
        // Для составных товаров управляем ингредиентами
        for (const ingredient of product.ingredients) {
          const stockChange = difference * ingredient.quantity;
          await ingredient.ingredientProduct.update({
            stock: ingredient.ingredientProduct.stock - stockChange
          });
          console.log(`Updated ingredient ${ingredient.ingredientProduct.name}: stock changed by ${-stockChange}`);
        }
      } else {
        // Для обычных товаров управляем основным остатком
        const stockChange = difference * product.unitSize;
        await product.update({
          stock: product.stock - stockChange
        });
        console.log(`Updated product ${product.name}: stock changed by ${-stockChange}`);
      }
    }
  }
}

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
    console.error('Error fetching products:', error);
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
    console.error('Error fetching products:', error);
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
    console.error('Error fetching products:', error);
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
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

// API эндпоинт для получения статистики товаров пользователя
app.get('/api/users/:id/product-stats', async (req, res) => {
  try {
    const userId = req.params.id;
    
    const stats = await UserProductStats.findAll({
      where: { userId },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'unit'],
        required: false
      }],
      order: [['totalQuantity', 'DESC']]
    });

    // Форматируем данные для фронтенда
    const formattedStats = stats.map(stat => ({
      productId: stat.productId,
      productName: stat.product ? stat.product.name : stat.productName,
      unit: stat.product ? stat.product.unit : 'шт',
      totalQuantity: parseFloat(stat.totalQuantity),
      totalAmount: parseFloat(stat.totalAmount),
      totalCostAmount: parseFloat(stat.totalCostAmount || 0),
      profit: parseFloat(stat.totalAmount) - parseFloat(stat.totalCostAmount || 0),
      orderCount: stat.orderCount,
      lastOrderDate: stat.lastOrderDate
    }));

    res.json(formattedStats);
  } catch (error) {
    console.error('Error fetching user product stats:', error);
    res.status(500).json({ error: 'Не удалось получить статистику товаров' });
  }
});

// API эндпоинт для получения общей статистики товаров
app.get('/api/products/analytics', async (req, res) => {
  try {
    const { period, page = 1, pageSize = 15, categoryId, sortBy, sortOrder = 'DESC', search, startDate, endDate } = req.query;

    const where = {};
    if (search) {
      where.productName = { [Op.iLike]: `%${search}%` };
    }

    // Приоритет: явный диапазон дат (startDate/endDate) имеет приоритет над preset period
    if (startDate || endDate) {
      const range = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        range[Op.gte] = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        range[Op.lte] = end;
      }
      where.lastOrderDate = range;
    } else if (period) {
      const now = new Date();
      let start;
      switch (period) {
        case 'today':
          start = new Date();
          start.setHours(0, 0, 0, 0);
          break;
        case '7days':
          start = new Date();
          start.setDate(start.getDate() - 7);
          break;
        case '30days':
          start = new Date();
          start.setDate(start.getDate() - 30);
          break;
      }
      if (start) {
        where.lastOrderDate = { [Op.gte]: start };
      }
    }

    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize, 10);

    const productInclude = {
      model: Product,
      as: 'product',
      attributes: ['price', 'costPrice', 'categoryId', 'unit'],
      include: {
        model: Category,
        as: 'category',
        attributes: ['name', 'color'],
      },
      required: false, // LEFT JOIN по умолчанию
    };

    if (categoryId) {
      productInclude.where = { categoryId };
      productInclude.required = true; // INNER JOIN для фильтрации
    }

    console.log(`[Analytics API] Received sorting request: sortBy='${sortBy}', sortOrder='${sortOrder}'`);

    let order = [['totalAmount', 'DESC']]; // Сортировка по умолчанию
    if (sortBy) {
      const validSortOrders = ['ASC', 'DESC'];
      const direction = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

      // Определяем поле для сортировки
      const sortableFields = {
        productName: 'productName',
        totalQuantity: 'totalQuantity',
        totalAmount: 'totalAmount',
        profit: sequelize.literal('"ProductStatistics"."totalAmount" - "ProductStatistics"."totalCostAmount"'),
        profitMargin: sequelize.literal('CASE WHEN "ProductStatistics"."totalAmount" > 0 THEN (("ProductStatistics"."totalAmount" - "ProductStatistics"."totalCostAmount") / "ProductStatistics"."totalAmount") * 100 ELSE 0 END'),
        orderCount: 'orderCount',
        lastOrderDate: 'lastOrderDate',
      };

      const sortField = sortableFields[sortBy];
      if (sortField) {
        // Для sequelize.literal и обычных полей
        order = [[sortField, direction]];
        console.log('[Analytics API] Applied sorting:', { sortBy, direction });
      } else {
        console.log(`[Analytics API] Warning: sortBy field '${sortBy}' is not sortable.`);
      }
    }

    const { count, rows: stats } = await ProductStatistics.findAndCountAll({
      where,
      include: [productInclude],
      order,
      offset,
      limit,
    });

    // Учитываем списания за выбранный период/диапазон
    let writeOffWhere = {};
    if (where.lastOrderDate) {
      writeOffWhere.createdAt = where.lastOrderDate;
    }
    // Агрегируем списания по товарам
    const writeOffsRaw = await WriteOff.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalWriteOffQty'],
      ],
      where: writeOffWhere,
      group: ['productId']
    });
    const writeOffMap = new Map();
    for (const w of writeOffsRaw) {
      const json = w.toJSON();
      writeOffMap.set(json.productId, parseFloat(json.totalWriteOffQty));
    }

    const enrichedStats = stats.map(stat => {
      const { product, ...rest } = stat.toJSON();
      const totalAmount = parseFloat(rest.totalAmount);
      const totalCostAmount = parseFloat(rest.totalCostAmount || 0);
      const profit = totalAmount - totalCostAmount;
      const profitMargin = totalAmount > 0 ? (profit / totalAmount) * 100 : 0;

      // Данные по списаниям
      const writeOffQty = writeOffMap.get(rest.productId) || 0;
      const currentCostPrice = product ? parseFloat(product.costPrice) : 0;
      const writeOffCostAmount = writeOffQty * currentCostPrice;
      const netQuantity = parseFloat(rest.totalQuantity) - writeOffQty;
      const netAmount = totalAmount; // выручка не меняется, но можно учесть, если нужно
      const netProfit = (totalAmount - totalCostAmount) - writeOffCostAmount;
      const netMargin = totalAmount > 0 ? (netProfit / totalAmount) * 100 : 0;

      return {
        ...rest,
        totalAmount,
        totalCostAmount,
        profit,
        profitMargin,
        currentPrice: product ? parseFloat(product.price) : 0,
        currentCostPrice,
        unit: product ? product.unit : 'шт.',
        category: product ? product.category : null,
        averageOrderQuantity: rest.orderCount > 0 ? parseFloat(rest.totalQuantity) / rest.orderCount : 0,
        // Поля со списаниями и нетто-метрики
        writeOffQuantity: writeOffQty,
        writeOffCostAmount,
        netQuantity,
        netAmount,
        netProfit,
        netMargin,
      };
    });

    res.json({ 
      stats: enrichedStats, 
      total: count, 
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
    });
  } catch (error) {
    console.error('Error fetching product analytics:', error);
    res.status(500).json({ error: 'Не удалось получить аналитику товаров' });
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
    const products = await Product.findAll({
      include: [
        { model: Category, as: 'category', required: false },
        {
          model: ProductIngredient,
          as: 'ingredients',
          include: [
            {
              model: Product,
              as: 'ingredientProduct',
              attributes: ['id', 'name', 'stock', 'unit']
            }
          ]
        }
      ],
      order: [ ['sortOrder', 'ASC'], ['name', 'ASC'] ]
    });

    // Для составных товаров рассчитываем доступное количество
    const productsWithCalculatedStock = products.map(product => {
      const productData = product.toJSON();
      
      if (productData.isComposite && productData.ingredients && Array.isArray(productData.ingredients) && productData.ingredients.length > 0) {
        // Рассчитываем максимальное количество порций на основе ингредиентов
        const availablePortions = productData.ingredients
          .map(ingredient => {
            if (!ingredient.ingredientProduct) {
              return Infinity; // Игнорируем ингредиенты, которые не удалось загрузить
            }
            const ingredientStock = ingredient.ingredientProduct.stock;
            const requiredQuantity = ingredient.quantity;
            if (requiredQuantity <= 0) return Infinity; // Избегаем деления на ноль
            return Math.floor(ingredientStock / requiredQuantity);
          })
          .filter(portions => portions !== Infinity);
        
        // Берем минимальное значение (лимитирующий ингредиент)
        // Берем минимальное значение (лимитирующий ингредиент)
        productData.availablePortions = availablePortions.length > 0 ? Math.min(...availablePortions) : 0;
        productData.calculatedStock = availablePortions.length > 0 ? Math.min(...availablePortions) : 0;
      }
      
      return productData;
    });

    res.json(productsWithCalculatedStock);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const product = await Product.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        {
          model: ProductIngredient,
          as: 'ingredients',
          include: [
            {
              model: Product,
              as: 'ingredientProduct',
              attributes: ['id', 'name', 'stock', 'unit']
            }
          ]
        }
      ]
    });
    
    if (product) {
      const productData = product.toJSON();
      
      // Для составных товаров рассчитываем доступное количество
      if (productData.isComposite && productData.ingredients && Array.isArray(productData.ingredients) && productData.ingredients.length > 0) {
        const availablePortions = productData.ingredients
          .map(ingredient => {
            if (!ingredient.ingredientProduct) {
              return Infinity; // Игнорируем ингредиенты, которые не удалось загрузить
            }
            const ingredientStock = ingredient.ingredientProduct.stock;
            const requiredQuantity = ingredient.quantity;
            if (requiredQuantity <= 0) return Infinity; // Избегаем деления на ноль
            return Math.floor(ingredientStock / requiredQuantity);
          })
          .filter(portions => portions !== Infinity);
        
        // Берем минимальное значение (лимитирующий ингредиент)
        productData.availablePortions = availablePortions.length > 0 ? Math.min(...availablePortions) : 0;
        productData.calculatedStock = availablePortions.length > 0 ? Math.min(...availablePortions) : 0;
      }
      
      res.json(productData);
    } else {
      res.status(404).json({ message: 'Товар не найден' });
    }
  } catch (error) {
    console.error('Error fetching products:', error);
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
    console.error('Error fetching products:', error);
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
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

// API для управления ингредиентами составных товаров
app.post('/api/products/:id/ingredients', async (req, res) => {
  try {
    const compositeProductId = parseInt(req.params.id);
    const { ingredientProductId, quantity } = req.body;

    // Проверяем, что составной товар существует и является составным
    const compositeProduct = await Product.findByPk(compositeProductId);
    if (!compositeProduct) {
      return res.status(404).json({ message: 'Составной товар не найден' });
    }
    if (!compositeProduct.isComposite) {
      return res.status(400).json({ message: 'Товар не является составным' });
    }

    // Проверяем, что ингредиент существует
    const ingredientProduct = await Product.findByPk(ingredientProductId);
    if (!ingredientProduct) {
      return res.status(404).json({ message: 'Товар-ингредиент не найден' });
    }

    // Создаем связь ингредиента
    const ingredient = await ProductIngredient.create({
      compositeProductId,
      ingredientProductId,
      quantity
    });

    res.status(201).json(ingredient);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ message: 'Этот ингредиент уже добавлен в состав товара' });
    } else {
      console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
    }
  }
});

app.get('/api/products/:id/ingredients', async (req, res) => {
  try {
    const compositeProductId = parseInt(req.params.id);
    
    const ingredients = await ProductIngredient.findAll({
      where: { compositeProductId },
      include: [
        {
          model: Product,
          as: 'ingredientProduct',
          attributes: ['id', 'name', 'stock', 'unit', 'price']
        }
      ]
    });

    res.json(ingredients);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/products/:id/ingredients/:ingredientId', async (req, res) => {
  try {
    const compositeProductId = parseInt(req.params.id);
    const ingredientId = parseInt(req.params.ingredientId);
    const { quantity } = req.body;

    const [updated] = await ProductIngredient.update(
      { quantity },
      {
        where: {
          id: ingredientId,
          compositeProductId: compositeProductId
        }
      }
    );

    if (updated) {
      const updatedIngredient = await ProductIngredient.findByPk(ingredientId, {
        include: [
          {
            model: Product,
            as: 'ingredientProduct',
            attributes: ['id', 'name', 'stock', 'unit']
          }
        ]
      });
      res.json(updatedIngredient);
    } else {
      res.status(404).json({ message: 'Ингредиент не найден' });
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/products/:id/ingredients/:ingredientId', async (req, res) => {
  try {
    const compositeProductId = parseInt(req.params.id);
    const ingredientId = parseInt(req.params.ingredientId);

    const deleted = await ProductIngredient.destroy({
      where: {
        id: ingredientId,
        compositeProductId: compositeProductId
      }
    });

    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Ингредиент не найден' });
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

// Обработчики для заказов
app.post('/api/orders', async (req, res) => {
  try {
    const { guestName, orderItems, totalAmount, status, paymentMethod, comment, guestId, guestsCount } = req.body;
    
    let userId = null;
    let finalGuestName = guestName?.trim() || '';
    
    // Определяем нужно ли назначить заказ пользователю с id=4
    const needsDefaultUser = () => {
      const name = finalGuestName.toLowerCase();
      if (!name) return true; // Пустое имя
      
      // Проверяем ключевые слова
      const keywords = ['стол', 'бар', 'улица', 'гость'];
      return keywords.some(keyword => name.includes(keyword));
    };
    
    // Если передан guestId, используем его
    if (guestId) {
      userId = guestId;
    } else if (needsDefaultUser()) {
      userId = 4; // Назначаем пользователю с id=4
      
      // Генерируем имя с номером если нужно
      if (!finalGuestName || ['стол', 'бар', 'улица', 'гость'].includes(finalGuestName.toLowerCase())) {
        // Получаем количество заказов пользователя с id=4 за сегодня для нумерации
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayOrdersCount = await Order.count({
          where: {
            userId: 4,
            createdAt: {
              [Op.gte]: today,
              [Op.lt]: tomorrow
            }
          }
        });
        
        const baseWord = finalGuestName || 'Гость';
        finalGuestName = `${baseWord} ${todayOrdersCount + 1}`;
      }
    } else if (finalGuestName) {
      // Обычная логика для именованных гостей
      let user = await User.findOne({ where: { name: finalGuestName } });
      
      if (!user) {
        // Создаем нового пользователя
        user = await User.create({
          name: finalGuestName,
          visitCount: 0,
          totalOrdersAmount: 0,
          averageCheck: 0,
          guestType: 'guest'
        });
        console.log(`Created new user: ${user.name} with ID: ${user.id}`);
      }
      
      userId = user.id;
    }
    
    // Создаем заказ
    const order = await Order.create({
      guestName: finalGuestName || null,
      userId: userId,
      orderItems,
      totalAmount,
      status: status || 'active',
      paymentMethod,
      comment,
      guestsCount: typeof guestsCount === 'number' && guestsCount > 0 ? guestsCount : 1
    });
    
    // Статистика пользователя обновляется только при закрытии заказа, не при создании
    
    // Списываем товары со склада
    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        const productData = await Product.findByPk(item.productId, {
          include: [
            {
              model: ProductIngredient,
              as: 'ingredients',
              include: [
                {
                  model: Product,
                  as: 'ingredientProduct'
                }
              ]
            }
          ]
        });

        if (productData.isComposite && productData.ingredients && Array.isArray(productData.ingredients) && productData.ingredients.length > 0) {
          // Для составных товаров списываем ингредиенты
          for (const ingredient of productData.ingredients) {
            const totalQuantityToDeduct = ingredient.quantity * item.quantity;
            await Product.decrement('stock', {
              by: totalQuantityToDeduct,
              where: { id: ingredient.ingredientProductId }
            });
          }
        } else {
          // Для обычных товаров списываем согласно unitSize
          const totalQuantityToDeduct = productData.unitSize * item.quantity;
          await Product.decrement('stock', {
            by: totalQuantityToDeduct,
            where: { id: item.productId }
          });
        }
      }
    }
    
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const { status } = req.query;
    const whereClause = status ? { status } : {};
    
    const orders = await Order.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const order = await Order.findByPk(id);
    
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Заказ не найден' });
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updateData = req.body;
    
    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }
    
    // Если статус меняется на completed или cancelled, устанавливаем closedAt
    if (updateData.status && (updateData.status === 'completed' || updateData.status === 'cancelled')) {
      updateData.closedAt = new Date();
      
      // Обновляем статистику пользователя при закрытии заказа
      if (updateData.status === 'completed' && order.userId) {
        await updateUserStatistics(order.userId, order.totalAmount);
        // Обновляем статистику товаров пользователя
        await updateUserProductStatistics(order.userId, order.orderItems);
      }
    }
    
    // Если обновляются orderItems, пересчитываем общую сумму и управляем остатками
    if (updateData.orderItems) {
      const totalAmount = updateData.orderItems.reduce((sum, item) => 
        sum + (Number(item.price) * Number(item.quantity)), 0
      );
      updateData.totalAmount = totalAmount;
      
      console.log('Updating order with new items:', {
        orderId: id,
        orderItems: updateData.orderItems,
        totalAmount: updateData.totalAmount
      });

      // Управляем остатками товаров при изменении заказа
      await updateStockForOrderChange(order.orderItems, updateData.orderItems);
    }
    
    // Если передан guestId, обновляем связь с пользователем
    if (updateData.guestId) {
      order.userId = updateData.guestId;
    }

    // Обновляем заказ с принудительным сохранением JSON полей
    if (updateData.orderItems) {
      order.orderItems = updateData.orderItems;
      order.totalAmount = updateData.totalAmount;
      order.changed('orderItems', true);
    }
    
    // Обновляем остальные поля
    Object.keys(updateData).forEach(key => {
      if (key !== 'orderItems' && key !== 'guestId') {
        order[key] = updateData[key];
      }
    });
    
    await order.save();
    
    res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

// Удаление позиции из заказа
app.put('/api/orders/:id/remove-item', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { itemIndex } = req.body;
    
    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }

    if (order.status !== 'active') {
      return res.status(400).json({ message: 'Можно удалять позиции только из активных заказов' });
    }

    const orderItems = [...order.orderItems];
    if (itemIndex < 0 || itemIndex >= orderItems.length) {
      return res.status(400).json({ message: 'Неверный индекс позиции' });
    }

    // Удаляем позицию
    const removedItem = orderItems.splice(itemIndex, 1)[0];
    
    // Возвращаем остатки удаленной позиции
    await updateStockForOrderChange([removedItem], []);
    
    // Пересчитываем общую сумму
    const newTotalAmount = orderItems.reduce((sum, item) => 
      sum + (Number(item.price) * item.quantity), 0
    );

    // Если все позиции удалены, отменяем заказ
    if (orderItems.length === 0) {
      await order.update({
        status: 'cancelled',
        comment: 'Заказ отменен - все позиции удалены',
        closedAt: new Date(),
        orderItems: [],
        totalAmount: 0
      });
    } else {
      await order.update({
        orderItems,
        totalAmount: newTotalAmount
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

// Добавление товара к заказу
app.put('/api/orders/:id/add-item', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { productId, quantity = 1 } = req.body;
    
    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }

    if (order.status !== 'active') {
      return res.status(400).json({ message: 'Можно добавлять позиции только к активным заказам' });
    }

    // Получаем информацию о товаре
    const product = await Product.findByPk(productId, {
      include: [
        { model: Category, as: 'category' },
        {
          model: ProductIngredient,
          as: 'ingredients',
          include: [{ model: Product, as: 'ingredientProduct' }]
        }
      ]
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Товар не найден' });
    }

    if (!product.isActive) {
      return res.status(400).json({ message: 'Товар неактивен' });
    }

    // Проверяем доступность товара
    if (product.isComposite) {
      // Для составных товаров проверяем доступные порции
      const availablePortions = calculateAvailablePortions(product.ingredients);
      if (availablePortions < quantity) {
        return res.status(400).json({ 
          message: `Недостаточно ингредиентов. Доступно порций: ${availablePortions}` 
        });
      }
    } else {
      // Для обычных товаров проверяем остатки
      if (product.stock < quantity * product.unitSize) {
        return res.status(400).json({ 
          message: `Недостаточно товара на складе. Доступно: ${product.stock} ${product.unit}` 
        });
      }
    }

    const orderItems = [...order.orderItems];
    
    // Проверяем, есть ли уже такой товар в заказе
    const existingItemIndex = orderItems.findIndex(item => {
      console.log('Comparing:', item.productId, 'with', productId, 'types:', typeof item.productId, typeof productId);
      return Number(item.productId) === Number(productId);
    });
    
    console.log('Adding item to order:', {
      orderId: order.id,
      productId,
      quantity,
      existingItemIndex,
      currentItems: orderItems
    });
    
    if (existingItemIndex >= 0) {
      // Увеличиваем количество существующей позиции
      const currentQuantity = Number(orderItems[existingItemIndex].quantity);
      orderItems[existingItemIndex].quantity = currentQuantity + Number(quantity);
      console.log('Updated existing item quantity:', orderItems[existingItemIndex].quantity);
    } else {
      // Добавляем новую позицию
      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: Number(quantity),
        price: Number(product.price)
      });
      console.log('Added new item to order');
    }

    // Списываем товары
    if (product.isComposite) {
      // Списываем ингредиенты для составного товара
      const ingredients = await ProductIngredient.findAll({
        where: { compositeProductId: product.id },
        include: [{ model: Product, as: 'ingredientProduct' }]
      });

      if (Array.isArray(ingredients)) {
        for (const ingredient of ingredients) {
          const requiredAmount = ingredient.quantity * quantity;
          await ingredient.ingredientProduct.update({
            stock: ingredient.ingredientProduct.stock - requiredAmount
          });
        }
      }
    } else {
      // Списываем обычный товар
      await product.update({
        stock: product.stock - (quantity * product.unitSize)
      });
    }

    // Пересчитываем общую сумму
    const newTotalAmount = orderItems.reduce((sum, item) => 
      sum + (Number(item.price) * item.quantity), 0
    );

    // Обновляем заказ с принудительным обновлением JSON поля
    await order.update({
      orderItems: orderItems,
      totalAmount: newTotalAmount
    }, {
      fields: ['orderItems', 'totalAmount']
    });
    
    // Принудительно помечаем поле как измененное
    order.changed('orderItems', true);
    await order.save();
    
    console.log('Order updated successfully:', {
      orderId: order.id,
      newOrderItems: orderItems,
      newTotalAmount: newTotalAmount
    });

    res.json(order);
  } catch (error) {
    console.error('Error fetching products:', error);
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
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

// Обработчики для категорий
app.post('/api/categories', async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: [{ model: Product, as: 'products' }]
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/categories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const category = await Category.findByPk(id, {
      include: [{ model: Product, as: 'products' }]
    });
    
    if (category) {
      res.json(category);
    } else {
      res.status(404).json({ message: 'Категория не найдена' });
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await Category.update(req.body, {
      where: { id: id }
    });
    
    if (updated) {
      const updatedCategory = await Category.findByPk(id);
      res.json(updatedCategory);
    } else {
      res.status(404).json({ message: 'Категория не найдена' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await Category.destroy({
      where: { id: id }
    });
    
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Категория не найдена' });
    }
  } catch (error) {
    console.error('Error fetching products:', error);
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
