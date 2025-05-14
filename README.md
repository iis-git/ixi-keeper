# Ixi-Keeper REST API

A simple REST API server built with Node.js and Express for managing multiple database tables.

## Setup
1. **Install Dependencies:**
   Run `npm install` to install all required packages.

2. **Start the Server:**
   - For development: `npm run dev` (uses Nodemon for auto-restart on file changes)
   - For production: `npm start`

## API Endpoints
The API supports CRUD operations for the following tables: `users`, `products`, `orders`.

### For each table:
- **Create**: `POST /api/{table}` - Add a new item
- **Read All**: `GET /api/{table}` - Get all items
- **Read One**: `GET /api/{table}/{id}` - Get a specific item by ID
- **Update**: `PUT /api/{table}/{id}` - Update a specific item by ID
- **Delete**: `DELETE /api/{table}/{id}` - Delete a specific item by ID

## Notes
- This setup uses an in-memory database for simplicity. In a production environment, replace it with a proper database solution like MongoDB, PostgreSQL, etc.
- Ensure you have Node.js installed on your system to run this application.
