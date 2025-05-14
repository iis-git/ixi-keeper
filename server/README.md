# Ixi-Keeper Server

Серверная часть приложения Ixi-Keeper, построенная на Node.js, Express и PostgreSQL.

## Структура проекта

```
server/
├── src/
│   ├── db/
│   │   ├── config/
│   │   │   └── database.js       # Конфигурация подключения к базе данных
│   │   └── models/
│   │       ├── User.js           # Модель пользователя
│   │       ├── Product.js        # Модель товара
│   │       ├── Order.js          # Модель заказа
│   │       ├── OrderProduct.js   # Связующая модель для заказов и товаров
│   │       └── index.js          # Инициализация моделей и связей
│   ├── server.js                 # Основной файл сервера
│   └── types/                    # Типы данных
├── .env                          # Переменные окружения
├── package.json                  # Зависимости и скрипты
└── README.md                     # Документация
```

## Установка и запуск

1. **Установите зависимости:**
   ```
   npm install
   ```

2. **Настройте базу данных PostgreSQL:**
   - Убедитесь, что у вас установлен Docker
   - Запустите PostgreSQL в Docker:
     ```
     docker run --name ixi-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ixi_keeper -p 5432:5432 -d postgres
     ```
   - Проверьте настройки подключения в файле `.env`

3. **Запустите сервер:**
   - Для разработки: `npm run dev` (с автоматической перезагрузкой при изменении файлов)
   - Для продакшена: `npm start`

## API Эндпоинты

API поддерживает CRUD операции для следующих таблиц: `users`, `products`, `orders`.

### Пользователи (Users)
- **GET /api/users** - Получить список всех пользователей
- **GET /api/users/:id** - Получить пользователя по ID
- **POST /api/users** - Создать нового пользователя
- **PUT /api/users/:id** - Обновить данные пользователя
- **DELETE /api/users/:id** - Удалить пользователя

### Товары (Products)
- **GET /api/products** - Получить список всех товаров
- **GET /api/products/:id** - Получить товар по ID
- **POST /api/products** - Создать новый товар
- **PUT /api/products/:id** - Обновить данные товара
- **DELETE /api/products/:id** - Удалить товар

### Заказы (Orders)
- **GET /api/orders** - Получить список всех заказов
- **GET /api/orders/:id** - Получить заказ по ID
- **POST /api/orders** - Создать новый заказ
- **PUT /api/orders/:id** - Обновить данные заказа
- **DELETE /api/orders/:id** - Удалить заказ

## Модели данных

### User (Пользователь)
- **id**: number - Уникальный идентификатор
- **name**: string - Имя пользователя
- **phone**: string - Телефон
- **totalOrdersAmount**: number - Общая сумма заказов
- **visitCount**: number - Количество посещений
- **averageCheck**: number - Средний чек

### Product (Товар)
- **id**: number - Уникальный идентификатор
- **name**: string - Название товара
- **description**: string - Описание товара
- **price**: number - Цена
- **stock**: number - Количество на складе

### Order (Заказ)
- **id**: number - Уникальный идентификатор
- **userId**: number - ID пользователя
- **totalAmount**: number - Общая сумма заказа
- **status**: string - Статус заказа

### OrderProduct (Товары в заказе)
- **id**: number - Уникальный идентификатор
- **orderId**: number - ID заказа
- **productId**: number - ID товара
- **quantity**: number - Количество товара
- **price**: number - Цена товара на момент заказа
