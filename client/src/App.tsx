import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/home/ui/HomePage';
import Users from './pages/Users';
import UserForm from './pages/UserForm';
import './styles/App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <h1>Ixi-Keeper</h1>
          <nav>
            <ul>
              <li><Link to="/">Главная</Link></li>
              <li><Link to="/users">Пользователи</Link></li>
              <li><Link to="/users/new">Добавить пользователя</Link></li>
            </ul>
          </nav>
        </header>
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/users" element={<Users />} />
            <Route path="/users/new" element={<UserForm />} />
            <Route path="/users/edit/:id" element={<UserForm />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <p>© 2025 IXI-Keeper. Прав ни у кого нет.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
