import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { HomePage } from '../../pages/home';
import { UsersPage } from '../../pages/users/ui/UsersPage';
import { UserFormPage } from '../../pages/user-form/ui/UserFormPage';
import { ProductsPage } from '../../pages/products';
import { ProductFormPage } from '../../pages/product-form';
import { ProductDisplayPage } from '../../pages/product-display';
import { CategoriesPage } from '../../pages/categories';
import { CategoryFormPage } from '../../pages/category-form';
import { OrdersPage } from '../../pages/orders';
import { InventoryPage } from '../../pages/inventory';
// @ts-ignore
import styles from './App.module.scss';


const App: React.FC = () => {
  return (
    <Router>
      <div className={styles.app}>
        <header className={styles.header}>
        <Link to="/"><h1>STILL-PAY</h1></Link>
          <nav>
            <ul>
              <li><Link to="/">Главная</Link></li>
              <li><Link to="/users">Гости</Link></li>
              <li><Link to="/categories">Категории</Link></li>
              <li><Link to="/products">Товары</Link></li>
              <li><Link to="/inventory">Остатки</Link></li>
              {/* <li><Link to="/product-display">Выбор товаров</Link></li> */}
              <li><Link to="/orders">Заказы</Link></li>
            </ul>
          </nav>
        </header>
        <main className={styles.content}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/new" element={<UserFormPage />} />
            <Route path="/users/edit/:id" element={<UserFormPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/new" element={<ProductFormPage />} />
            <Route path="/products/edit/:id" element={<ProductFormPage />} />
            <Route path="/product-display" element={<ProductDisplayPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/categories/new" element={<CategoryFormPage />} />
            <Route path="/categories/edit/:id" element={<CategoryFormPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
          </Routes>
        </main>
        <footer className={styles.footer}>
          <p>© 2025 iXi-Keeper. Прав ни у кого нет.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
