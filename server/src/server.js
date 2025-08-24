require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./db/models');
const app = express();
const port = process.env.PORT || 3020;

// Импортируем модели
const { User, Product, Order, OrderProduct, Category, ProductIngredient } = require('./db/models');
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

// Middleware
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
    const products = await Product.findAll({
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

    // Для составных товаров рассчитываем доступное количество
    const productsWithCalculatedStock = products.map(product => {
      const productData = product.toJSON();
      
      if (productData.isComposite && productData.ingredients && Array.isArray(productData.ingredients) && productData.ingredients.length > 0) {
        // Рассчитываем максимальное количество порций на основе ингредиентов
        const availablePortions = productData.ingredients.map(ingredient => {
          const ingredientStock = ingredient.ingredientProduct.stock;
          const requiredQuantity = ingredient.quantity;
          return Math.floor(ingredientStock / requiredQuantity);
        });
        
        // Берем минимальное значение (лимитирующий ингредиент)
        productData.availablePortions = Math.min(...availablePortions);
        productData.calculatedStock = Math.min(...availablePortions);
      }
      
      return productData;
    });

    res.json(productsWithCalculatedStock);
  } catch (error) {
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
        const availablePortions = productData.ingredients.map(ingredient => {
          const ingredientStock = ingredient.ingredientProduct.stock;
          const requiredQuantity = ingredient.quantity;
          return Math.floor(ingredientStock / requiredQuantity);
        });
        
        productData.availablePortions = Math.min(...availablePortions);
        productData.calculatedStock = Math.min(...availablePortions);
      }
      
      res.json(productData);
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
    res.status(500).json({ message: error.message });
  }
});

// Обработчики для заказов
app.post('/api/orders', async (req, res) => {
  try {
    const { guestName, orderItems, totalAmount, status, paymentMethod, comment, guestId } = req.body;
    
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
          averageCheck: 0
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
      comment
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
    
    // Обновляем заказ с принудительным сохранением JSON полей
    if (updateData.orderItems) {
      order.orderItems = updateData.orderItems;
      order.totalAmount = updateData.totalAmount;
      order.changed('orderItems', true);
    }
    
    // Обновляем остальные поля
    Object.keys(updateData).forEach(key => {
      if (key !== 'orderItems') {
        order[key] = updateData[key];
      }
    });
    
    await order.save();
    
    res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
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
