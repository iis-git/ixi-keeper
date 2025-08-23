require('dotenv').config();
const { Order } = require('./src/db/models');

async function createTestOrders() {
  try {
    // Создаем тестовые заказы
    const testOrders = [
      {
        guestName: 'Алексей Петров',
        orderItems: [
          { productId: 1, productName: 'Кофе американо', quantity: 2, price: 150.00 },
          { productId: 2, productName: 'Круассан', quantity: 1, price: 120.00 }
        ],
        totalAmount: 420.00,
        status: 'active',
        comment: 'Без сахара в кофе'
      },
      {
        guestName: 'Мария Иванова',
        orderItems: [
          { productId: 3, productName: 'Капучино', quantity: 1, price: 180.00 },
          { productId: 4, productName: 'Чизкейк', quantity: 1, price: 250.00 }
        ],
        totalAmount: 430.00,
        status: 'active'
      },
      {
        guestName: 'Дмитрий Сидоров',
        orderItems: [
          { productId: 1, productName: 'Кофе американо', quantity: 1, price: 150.00 }
        ],
        totalAmount: 150.00,
        status: 'completed',
        paymentMethod: 'card',
        closedAt: new Date(Date.now() - 3600000), // 1 час назад
        comment: 'Спасибо за обслуживание!'
      },
      {
        guestName: 'Елена Козлова',
        orderItems: [
          { productId: 5, productName: 'Мохито', quantity: 2, price: 320.00 },
          { productId: 6, productName: 'Салат Цезарь', quantity: 1, price: 380.00 }
        ],
        totalAmount: 1020.00,
        status: 'cancelled',
        closedAt: new Date(Date.now() - 1800000), // 30 минут назад
        comment: 'Клиент передумал'
      },
      {
        guestName: 'Андрей Волков',
        orderItems: [
          { productId: 7, productName: 'Латте', quantity: 1, price: 170.00 },
          { productId: 8, productName: 'Тирамису', quantity: 1, price: 280.00 }
        ],
        totalAmount: 450.00,
        status: 'active',
        comment: 'К столику у окна'
      }
    ];

    // Удаляем существующие тестовые заказы
    await Order.destroy({ where: {} });
    console.log('Существующие заказы удалены');

    // Создаем новые тестовые заказы
    for (const orderData of testOrders) {
      const order = await Order.create(orderData);
      console.log(`Создан заказ #${order.id} для ${order.guestName}`);
    }

    console.log('Тестовые заказы успешно созданы!');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при создании тестовых заказов:', error);
    process.exit(1);
  }
}

createTestOrders();
