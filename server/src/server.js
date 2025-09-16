// Shift endpoints are registered after app initialization below
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./db/models');
const app = express();
const port = process.env.PORT || 3020;

// Импортируем модели
const { User, Product, Category, Order, UserProductStats, ProductStatistics, ProductIngredient, WriteOff, Shift, ShiftBartender } = require('./db/models');
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

// Заказы конкретной смены (минимальные поля для отчётов)
app.get('/api/shifts/:id/orders', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { Order } = require('./db/models');
    const orders = await Order.findAll({
      where: { shiftId: id },
      attributes: ['id','guestName','status','paymentMethod','totalAmount','discountAmount','netAmount','guestsCount','closedAt','createdAt','closedByUserId']
    });
    res.json(orders);
  } catch (e) {
    console.error('Error fetching shift orders:', e);
    res.status(500).json({ message: 'Не удалось получить заказы смены' });
  }
});

// Обеспечиваем парсинг тела запросов до объявления маршрутов списаний
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ======== Shift helpers and endpoints (registered after app init) ========
async function getActiveShift() {
  const { Shift } = require('./db/models');
  const active = await Shift.findOne({ where: { status: 'open' }, order: [['openedAt', 'DESC']] });
  // Debug: log whether active shift exists
  console.log('[API] getActiveShift ->', active ? { id: active.id, openedAt: active.openedAt } : 'none');
  return active;
}

app.get('/api/shifts/active', async (req, res) => {
  try {
    const { ShiftBartender, User } = require('./db/models');
    console.log('[API] GET /api/shifts/active');
    const shift = await getActiveShift();
    if (!shift) {
      console.log('[API] /api/shifts/active -> 204 No active shift');
      return res.status(204).send();
    }
    const bartenders = await ShiftBartender.findAll({ where: { shiftId: shift.id }, include: [{ model: User, as: 'user', attributes: ['id','name'] }] });
    console.log('[API] /api/shifts/active -> shift', { id: shift.id }, 'bartenders:', bartenders.length);
    res.json({ shift, bartenders });
  } catch (e) {
    console.error('Error fetching active shift:', e);
    res.status(500).json({ message: 'Не удалось получить активную смену' });
  }
});

app.get('/api/shifts', async (req, res) => {
  try {
    console.log('[API] GET /api/shifts');
    const { Shift } = require('./db/models');
    const shifts = await Shift.findAll({ order: [['openedAt', 'DESC']] });
    console.log('[API] /api/shifts -> count:', Array.isArray(shifts) ? shifts.length : 'n/a');
    res.json(shifts);
  } catch (e) {
    console.error('Error fetching shifts:', e);
    res.status(500).json({ message: 'Не удалось получить список смен' });
  }
});

app.get('/api/shifts/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { Shift, ShiftBartender, User, Order } = require('./db/models');
    const shift = await Shift.findByPk(id);
    if (!shift) return res.status(404).json({ message: 'Смена не найдена' });
    const bartenders = await ShiftBartender.findAll({ where: { shiftId: id }, include: [{ model: User, as: 'user', attributes: ['id','name'] }] });

    // Optionally recompute summary from orders if absent or on demand via query param
    const wantRecompute = String(req.query.recompute || '').toLowerCase() === '1' || String(req.query.recompute || '').toLowerCase() === 'true';
    let computedSummary = null;
    try {
      const orders = await Order.findAll({ where: { shiftId: id } });
      const computeShiftSummary = (orders) => {
        const list = Array.isArray(orders) ? orders : [];
        const completed = list.filter(o => o.status === 'completed');
        const cancelled = list.filter(o => o.status === 'cancelled');
        const gross = list.reduce((s,o)=> s + Number(o.totalAmount||0), 0);
        const discount = list.reduce((s,o)=> s + Number(o.discountAmount||0), 0);
        const net = list.reduce((s,o)=> s + Number((o.netAmount ?? o.totalAmount) || 0), 0);
        const avgCheckNet = completed.length
          ? completed.reduce((s,o)=> s + Number((o.netAmount ?? o.totalAmount) || 0), 0) / completed.length
          : 0;
        const guests = completed.reduce((s,o)=> s + Number(o.guestsCount||0), 0);
        const payments = (()=>{
          const map = { cash: 0, card: 0, transfer: 0 };
          for (const o of completed) {
            const amt = Number((o.netAmount ?? o.totalAmount) || 0);
            if (o.paymentMethod && Object.prototype.hasOwnProperty.call(map, o.paymentMethod)) {
              map[o.paymentMethod] += amt;
            }
          }
          return map;
        })();
        return {
          orders: {
            total: list.length,
            completed: completed.length,
            cancelled: cancelled.length,
          },
          revenue: { gross, discount, net },
          avgCheckNet,
          guests,
          payments,
        };
      };

      const isEmptySummary = !shift.summary || (typeof shift.summary === 'object' && Object.keys(shift.summary).length === 0);
      if (wantRecompute || isEmptySummary) {
        computedSummary = computeShiftSummary(orders);
      }

      const responseShift = shift.toJSON();
      if (computedSummary) {
        responseShift.summary = computedSummary;
      }
      console.log('[API] GET /api/shifts/:id ->', { id, recompute: !!computedSummary, orders: orders.length });
      return res.json({ shift: responseShift, bartenders });
    } catch (e) {
      console.error('[API] /api/shifts/:id summary compute error', e);
      // Возвращаем без вычисленного summary, если произошла ошибка вычисления
      return res.json({ shift, bartenders });
    }
  } catch (e) {
    console.error('Error fetching shift:', e);
    res.status(500).json({ message: 'Не удалось получить смену' });
  }
});

app.post('/api/shifts/open', async (req, res) => {
  try {
    const { bartenders = [], openingNote, openingCashAmount, openedByUserId } = req.body;
    const { Shift, ShiftBartender } = require('./db/models');
    const existing = await getActiveShift();
    if (existing) return res.status(400).json({ message: 'Уже есть активная смена' });
    const shift = await Shift.create({ openedAt: new Date(), status: 'open', openingNote: openingNote || null, openingCashAmount: openingCashAmount ?? null, openedByUserId: openedByUserId || null });
    for (const uid of bartenders) {
      await ShiftBartender.create({ shiftId: shift.id, userId: uid });
    }
    res.status(201).json(shift);
  } catch (e) {
    console.error('Error opening shift:', e);
    res.status(500).json({ message: 'Не удалось открыть смену' });
  }
});

app.post('/api/shifts/:id/close', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { closingNote, closingCashAmount } = req.body;
    const { Shift, Order } = require('./db/models');
    const shift = await Shift.findByPk(id);
    if (!shift) return res.status(404).json({ message: 'Смена не найдена' });
    if (shift.status !== 'open') return res.status(400).json({ message: 'Смена уже закрыта' });

    // Агрегации по заказам смены
    const orders = await Order.findAll({ where: { shiftId: id } });
    const summary = {
      orders: {
        total: orders.length,
        completed: orders.filter(o => o.status === 'completed').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
      },
      revenue: {
        gross: orders.reduce((s,o)=> s + Number(o.totalAmount||0), 0),
        discount: orders.reduce((s,o)=> s + Number(o.discountAmount||0), 0),
        net: orders.reduce((s,o)=> s + Number((o.netAmount ?? o.totalAmount) || 0), 0),
      },
      avgCheckNet: (()=>{
        const comps = orders.filter(o=>o.status==='completed');
        const net = comps.reduce((s,o)=> s + Number((o.netAmount ?? o.totalAmount) || 0), 0);
        return comps.length ? net / comps.length : 0;
      })(),
      guests: orders.filter(o=>o.status==='completed').reduce((s,o)=> s + Number(o.guestsCount||0), 0),
      payments: (()=>{
        const map = { cash: 0, card: 0, transfer: 0 };
        for (const o of orders.filter(o=>o.status==='completed')) {
          const amt = Number((o.netAmount ?? o.totalAmount) || 0);
          if (o.paymentMethod && map.hasOwnProperty(o.paymentMethod)) map[o.paymentMethod] += amt;
        }
        return map;
      })(),
    };

    await shift.update({ status: 'closed', closedAt: new Date(), closingNote: closingNote || null, closingCashAmount: closingCashAmount ?? null, summary });
    res.json(shift);
  } catch (e) {
    console.error('Error closing shift:', e);
    res.status(500).json({ message: 'Не удалось закрыть смену' });
  }
});
// Хелпер: пересчет сумм заказа с учетом скидки пользователя или ручной скидки заказа
async function recalcOrderTotals(orderInstance) {
  try {
    // Не пересчитываем исторические заказы (completed/cancelled),
    // чтобы изменение пользовательской скидки не влияло задним числом
    if (orderInstance.status && orderInstance.status !== 'active') {
      return orderInstance;
    }
    // Gross сумма (валовая) из позиций
    const items = Array.isArray(orderInstance.orderItems) ? orderInstance.orderItems : [];
    const gross = items.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity)), 0);

    // Определяем эффективную скидку: приоритет у ручной скидки заказа
    let userDiscount = 0;
    if (orderInstance.userId) {
      const u = await User.findByPk(orderInstance.userId);
      if (u && u.discountPercent) userDiscount = parseFloat(u.discountPercent);
    }
    const manual = orderInstance.discountPercent ? parseFloat(orderInstance.discountPercent) : 0;
    const effectivePercent = Math.max(0, Math.min(100, manual > 0 ? manual : userDiscount));

    const discountAmount = +(gross * (effectivePercent / 100)).toFixed(2);
    const netAmount = +(gross - discountAmount).toFixed(2);

    await orderInstance.update({
      totalAmount: gross,
      discountAmount,
      netAmount,
      // discountPercent оставляем как есть (ручная). Если 0 — действует пользовательская скидка.
    }, { fields: ['totalAmount', 'discountAmount', 'netAmount'] });

    return orderInstance;
  } catch (e) {
    console.error('recalcOrderTotals error:', e);
    return orderInstance;
  }
}

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
    const guestType = req.query.guestType;

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

    // Если указан тип гостя, считаем статистику на основе UserProductStats с фильтром по пользователям этого типа
    if (guestType) {
      // Загружаем строки статистики пользователя-товара с фильтрами по дате (аппроксимация как и раньше — по lastOrderDate)
      const upsWhere = {};
      if (where.lastOrderDate) {
        upsWhere.lastOrderDate = where.lastOrderDate;
      }

      const upsInclude = [
        {
          ...productInclude
        },
        {
          model: User,
          as: 'user',
          required: true,
          where: { guestType }
        }
      ];

      const upsRows = await UserProductStats.findAll({
        where: upsWhere,
        include: upsInclude
      });

      // Агрегация по productId в памяти
      const agg = new Map();
      for (const row of upsRows) {
        const json = row.toJSON();
        // Поиск/категория фильтр (по имени продукта и категории)
        const p = json.product;
        if (search) {
          const name = (json.productName || (p && p.name) || '').toLowerCase();
          if (!name.includes(String(search).toLowerCase())) continue;
        }
        if (categoryId && (!p || p.categoryId !== Number(categoryId))) continue;

        const key = json.productId;
        if (!agg.has(key)) {
          agg.set(key, {
            productId: json.productId,
            productName: p ? p.name : json.productName,
            totalQuantity: 0,
            totalAmount: 0,
            totalCostAmount: 0,
            orderCount: 0,
            lastOrderDate: null,
            product: p || null
          });
        }
        const a = agg.get(key);
        a.totalQuantity += parseFloat(json.totalQuantity || 0);
        a.totalAmount += parseFloat(json.totalAmount || 0);
        a.totalCostAmount += parseFloat(json.totalCostAmount || 0);
        a.orderCount += parseInt(json.orderCount || 0);
        if (!a.lastOrderDate || (json.lastOrderDate && new Date(json.lastOrderDate) > new Date(a.lastOrderDate))) {
          a.lastOrderDate = json.lastOrderDate;
        }
      }

      // Списания: фильтруем по заказам пользователей выбранного типа гостя и по диапазону дат
      const writeOffWhere = {};
      if (where.lastOrderDate) {
        writeOffWhere.createdAt = where.lastOrderDate;
      }
      const writeOffsRaw = await WriteOff.findAll({
        attributes: [
          'productId',
          [sequelize.fn('SUM', sequelize.col('quantity')), 'totalWriteOffQty'],
        ],
        where: writeOffWhere,
        include: [
          {
            model: Order,
            as: 'order',
            required: true,
            include: [
              {
                model: User,
                as: 'user',
                required: true,
                where: { guestType }
              }
            ]
          }
        ],
        group: ['productId']
      });
      const writeOffMap = new Map();
      for (const w of writeOffsRaw) {
        const json = w.toJSON();
        writeOffMap.set(json.productId, parseFloat(json.totalWriteOffQty));
      }

      // Преобразуем в массив и обогащаем как раньше
      let enrichedStats = Array.from(agg.values()).map((rest) => {
        const product = rest.product;
        const totalAmount = parseFloat(rest.totalAmount);
        const totalCostAmount = parseFloat(rest.totalCostAmount || 0);
        const profit = totalAmount - totalCostAmount;
        const profitMargin = totalAmount > 0 ? (profit / totalAmount) * 100 : 0;

        const writeOffQty = writeOffMap.get(rest.productId) || 0;
        const currentCostPrice = product ? parseFloat(product.costPrice) : 0;
        const writeOffCostAmount = writeOffQty * currentCostPrice;
        const netQuantity = parseFloat(rest.totalQuantity) - writeOffQty;
        const netAmount = totalAmount;
        const netProfit = (totalAmount - totalCostAmount) - writeOffCostAmount;
        const netMargin = totalAmount > 0 ? (netProfit / totalAmount) * 100 : 0;

        return {
          productId: rest.productId,
          productName: rest.productName,
          totalQuantity: parseFloat(rest.totalQuantity),
          totalAmount,
          totalCostAmount,
          profit,
          profitMargin,
          orderCount: rest.orderCount,
          lastOrderDate: rest.lastOrderDate,
          currentPrice: product ? parseFloat(product.price) : 0,
          currentCostPrice,
          unit: product ? product.unit : 'шт.',
          category: product ? product.category : null,
          averageOrderQuantity: rest.orderCount > 0 ? parseFloat(rest.totalQuantity) / rest.orderCount : 0,
          writeOffQuantity: writeOffQty,
          writeOffCostAmount,
          netQuantity,
          netAmount,
          netProfit,
          netMargin,
        };
      });

      // Сортировка
      const dir = String(sortOrder || 'DESC').toUpperCase() === 'ASC' ? 1 : -1;
      const sortKey = String(sortBy || 'totalAmount');
      const getSortVal = (x) => {
        switch (sortKey) {
          case 'productName': return (x.productName || '').toLowerCase();
          case 'totalQuantity': return x.totalQuantity;
          case 'totalAmount': return x.totalAmount;
          case 'profit': return x.profit;
          case 'profitMargin': return x.profitMargin;
          case 'orderCount': return x.orderCount;
          case 'lastOrderDate': return x.lastOrderDate ? new Date(x.lastOrderDate).getTime() : 0;
          default: return x.totalAmount;
        }
      };
      enrichedStats.sort((a, b) => {
        const va = getSortVal(a);
        const vb = getSortVal(b);
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });

      // Пагинация в памяти
      const total = enrichedStats.length;
      const p = parseInt(page, 10);
      const ps = parseInt(pageSize, 10);
      const paged = enrichedStats.slice((p - 1) * ps, (p - 1) * ps + ps);

      return res.json({ stats: paged, total, page: p, pageSize: ps });
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
    // Требуем активную смену для создания заказа
    const activeShift = await getActiveShift();
    if (!activeShift) {
      return res.status(409).json({ message: 'Нет активной смены. Откройте смену, чтобы создавать заказы.' });
    }
    
    let userId = null;
    let finalGuestName = guestName?.trim() || '';
    
    // Определяем нужно ли назначить заказ "дефолтному" гостю
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
      // Ищем/создаем "дефолтного" гостя, чтобы не зависеть от фиксированного id
      const [defaultGuest] = await User.findOrCreate({
        where: { name: 'Гость' },
        defaults: {
          name: 'Гость',
          visitCount: 0,
          totalOrdersAmount: 0,
          averageCheck: 0,
          guestType: 'guest'
        }
      });
      userId = defaultGuest.id;

      // Генерируем имя с номером (Гость N) на сегодня
      if (!finalGuestName || ['стол', 'бар', 'улица', 'гость'].includes(finalGuestName.toLowerCase())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayOrdersCount = await Order.count({
          where: {
            userId: userId,
            createdAt: {
              [Op.gte]: today,
              [Op.lt]: tomorrow
            }
          }
        });
        const baseWord = 'Гость';
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
      guestsCount: typeof guestsCount === 'number' && guestsCount > 0 ? guestsCount : 1,
      shiftId: activeShift.id
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
    
    // Пересчет итогов с учетом скидок пользователя / ручной скидки заказа
    await recalcOrderTotals(order);

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
    // Для активных заказов пересчитываем скидки на лету (учтя текущую скидку пользователя, если нет ручной)
    for (const o of orders) {
      if (o.status === 'active') {
        await recalcOrderTotals(o);
      }
    }
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
      if (order.status === 'active') {
        await recalcOrderTotals(order);
      }
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
      if (updateData.closedByUserId) {
        // Сохраняем, кто закрыл заказ (бармен)
        order.closedByUserId = updateData.closedByUserId;
      }
      
      // Обновляем статистику пользователя при закрытии заказа
      if (updateData.status === 'completed' && order.userId) {
        // Перед закрытием пересчитаем скидки/итоги на случай, если они изменились
        await recalcOrderTotals(order);
        const finalAmount = order.netAmount != null ? parseFloat(order.netAmount) : parseFloat(order.totalAmount);
        await updateUserStatistics(order.userId, finalAmount);
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
      await order.update({ orderItems: updateData.orderItems, totalAmount: updateData.totalAmount, status: updateData.status, paymentMethod: updateData.paymentMethod, comment: updateData.comment, closedAt: updateData.closedAt });
      // Пересчитываем скидки/итог
      await recalcOrderTotals(order);
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
    if (!order) return res.status(404).json({ message: 'Заказ не найден' });
    if (order.status !== 'active') return res.status(400).json({ message: 'Можно удалять позиции только в активном заказе' });

    const items = Array.isArray(order.orderItems) ? [...order.orderItems] : [];
    if (itemIndex < 0 || itemIndex >= items.length) return res.status(400).json({ message: 'Некорректный индекс позиции' });

    const removed = items[itemIndex];

    // Возвращаем товар на склад
    const product = await Product.findByPk(removed.productId, {
      include: [
        {
          model: ProductIngredient,
          as: 'ingredients',
          include: [{ model: Product, as: 'ingredientProduct' }]
        }
      ]
    });
    if (product) {
      if (product.isComposite && product.ingredients && Array.isArray(product.ingredients)) {
        for (const ingredient of product.ingredients) {
          const qty = Number(removed.quantity) * Number(ingredient.quantity);
          await ingredient.ingredientProduct.update({ stock: parseFloat(ingredient.ingredientProduct.stock) + qty });
        }
      } else {
        const qty = Number(removed.quantity) * Number(product.unitSize || 1);
        await product.update({ stock: parseFloat(product.stock) + qty });
      }
    }

    // Удаляем позицию и пересчитываем суммы
    items.splice(itemIndex, 1);
    const newTotal = items.reduce((s, it) => s + (Number(it.price) * Number(it.quantity)), 0);
    await order.update({ orderItems: items, totalAmount: newTotal }, { fields: ['orderItems', 'totalAmount'] });
    await recalcOrderTotals(order);
    order.changed('orderItems', true);
    await order.save();
    res.json(order);
  } catch (error) {
    console.error('Error removing item from order:', error);
    res.status(500).json({ message: error.message });
  }
});

// Добавление позиции в активный заказ
app.put('/api/orders/:id/add-item', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { productId, quantity = 1 } = req.body;

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: 'Заказ не найден' });
    if (order.status !== 'active') return res.status(400).json({ message: 'Можно добавлять позиции только в активный заказ' });

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ message: 'Товар не найден' });

    const items = Array.isArray(order.orderItems) ? [...order.orderItems] : [];
    const idx = items.findIndex(it => Number(it.productId) === Number(productId));
    if (idx >= 0) {
      items[idx].quantity = Number(items[idx].quantity) + Number(quantity);
    } else {
      items.push({ productId: product.id, productName: product.name, quantity: Number(quantity), price: Number(product.price) });
    }

    // Списываем со склада
    if (product.isComposite) {
      const ingredients = await ProductIngredient.findAll({
        where: { compositeProductId: product.id },
        include: [{ model: Product, as: 'ingredientProduct' }]
      });
      for (const ing of ingredients) {
        const qty = Number(quantity) * Number(ing.quantity);
        await ing.ingredientProduct.update({ stock: parseFloat(ing.ingredientProduct.stock) - qty });
      }
    } else {
      const qty = Number(quantity) * Number(product.unitSize || 1);
      await product.update({ stock: parseFloat(product.stock) - qty });
    }

    const newTotal = items.reduce((s, it) => s + (Number(it.price) * Number(it.quantity)), 0);
    await order.update({ orderItems: items, totalAmount: newTotal }, { fields: ['orderItems', 'totalAmount'] });
    await recalcOrderTotals(order);
    order.changed('orderItems', true);
    await order.save();
    await recalcOrderTotals(order);
    res.json(order);
  } catch (error) {
    console.error('Error adding item to order:', error);
    res.status(500).json({ message: error.message });
  }
});

// Установка ручной скидки на активный заказ
app.put('/api/orders/:id/discount', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { discountPercent } = req.body;
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: 'Заказ не найден' });
    if (order.status !== 'active') return res.status(400).json({ message: 'Скидка доступна только для активного заказа' });

    let p = Number(discountPercent);
    if (isNaN(p)) p = 0;
    p = Math.max(0, Math.min(100, p));

    await order.update({ discountPercent: p }, { fields: ['discountPercent'] });
    await recalcOrderTotals(order);
    return res.json(order);
  } catch (error) {
    console.error('Error setting order discount:', error);
    return res.status(500).json({ message: 'Не удалось применить скидку' });
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
