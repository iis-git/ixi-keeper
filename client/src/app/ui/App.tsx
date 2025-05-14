import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { HomePage } from '../../pages/home/ui/HomePage';
import { UsersPage } from '../../pages/users/ui/UsersPage';
import { UserFormPage } from '../../pages/user-form/ui/UserFormPage';
// @ts-ignore
import styles from './App.module.scss';


const App: React.FC = () => {
  return (
    <Router>
      <div className={styles.app}>
        <header className={styles.header}>
          <h1>Ixi-Keeper</h1>
          <nav>
            <ul>
              <li><Link to="/">Главная</Link></li>
              <li><Link to="/users">Пользователи</Link></li>
              <li><Link to="/users/new">Добавить пользователя</Link></li>
            </ul>
          </nav>
        </header>
        <main className={styles.content}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/new" element={<UserFormPage />} />
            <Route path="/users/edit/:id" element={<UserFormPage />} />
          </Routes>
        </main>
        <footer className={styles.footer}>
          <p>© 2025 Ixi-Keeper. Все права защищены.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
