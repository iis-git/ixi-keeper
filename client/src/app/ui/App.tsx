import React, { useEffect, Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
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
import { ProductAnalyticsPage } from '../../pages/product-analytics';
const ShiftsPage = lazy(() => import('../../pages/shifts/ui/ShiftsPage'));
const ShiftDetailsPage = lazy(() => import('../../pages/shifts/ui/ShiftDetailsPage'));
import { ShiftModal } from '../../features/shifts/shift-modal';
import { Button } from 'antd';
// @ts-ignore
import styles from './App.module.scss';


const RouteLogger: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[App] Route changed:', location.pathname);
  }, [location.pathname]);
  return null;
};

const App: React.FC = () => {
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  return (
    <Router>
      <div className={styles.app}>
        <RouteLogger />
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
              <li><Link to="/analytics">Аналитика</Link></li>
              <li><Link to="/shifts">Смены</Link></li>
              <li>
                <Button type="primary" onClick={() => setShiftModalOpen(true)}>
                  Смена
                </Button>
              </li>
            </ul>
          </nav>
        </header>
        <main className={styles.content}>
          <Suspense fallback={<div style={{ padding: 16 }}>Загрузка...</div>}>
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
            <Route path="/analytics" element={<ProductAnalyticsPage />} />
            <Route path="/shifts" element={<ShiftsPage />} />
            <Route path="/shifts/:id" element={<ShiftDetailsPage />} />
          </Routes>
          </Suspense>
        </main>
        <ShiftModal
          open={shiftModalOpen}
          onClose={() => setShiftModalOpen(false)}
          onShiftChanged={() => setShiftModalOpen(false)}
        />
        <footer className={styles.footer}>
          <p>© 2025 iXi-Keeper. Прав ни у кого нет.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
