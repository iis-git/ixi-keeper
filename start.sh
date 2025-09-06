#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Запуск Ixi-Keeper приложения...${NC}"

# Функция для проверки и запуска PostgreSQL
start_postgres() {
    echo -e "${YELLOW}📊 Проверка PostgreSQL...${NC}"
    
    # Проверяем, запущен ли PostgreSQL
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL уже запущен${NC}"
    else
        echo -e "${YELLOW}🔄 Запуск PostgreSQL...${NC}"
        
        # Пробуем запустить через brew
        if command -v brew >/dev/null 2>&1; then
            if brew services list | grep -q "postgresql@14.*started"; then
                echo -e "${GREEN}✅ PostgreSQL уже запущен через Homebrew${NC}"
            else
                brew services start postgresql@14
                echo -e "${GREEN}✅ PostgreSQL запущен через Homebrew${NC}"
            fi
        else
            echo -e "${RED}❌ Homebrew не найден. Установите PostgreSQL вручную${NC}"
            exit 1
        fi
        
        # Ждем запуска PostgreSQL
        echo -e "${YELLOW}⏳ Ожидание готовности PostgreSQL...${NC}"
        for i in {1..30}; do
            if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
                echo -e "${GREEN}✅ PostgreSQL готов к работе${NC}"
                break
            fi
            sleep 1
        done
        
        if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
            echo -e "${RED}❌ PostgreSQL не запустился за 30 секунд${NC}"
            exit 1
        fi
    fi
}

# Функция для создания базы данных
setup_database() {
    echo -e "${YELLOW}🗄️ Настройка базы данных...${NC}"
    
    # Проверяем существование базы данных
    if psql -lqt | cut -d \| -f 1 | grep -qw ixi_keeper; then
        echo -e "${GREEN}✅ База данных ixi_keeper уже существует${NC}"
    else
        echo -e "${YELLOW}🔄 Создание базы данных ixi_keeper...${NC}"
        createdb ixi_keeper
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ База данных создана${NC}"
        else
            echo -e "${RED}❌ Ошибка создания базы данных${NC}"
            exit 1
        fi
    fi
}

# Функция для установки зависимостей
install_dependencies() {
    echo -e "${YELLOW}📦 Проверка зависимостей...${NC}"
    
    # Корневые зависимости
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}🔄 Установка корневых зависимостей...${NC}"
        npm install
    else
        echo -e "${GREEN}✅ Корневые зависимости установлены${NC}"
    fi
    
    # Зависимости сервера
    if [ ! -d "server/node_modules" ]; then
        echo -e "${YELLOW}🔄 Установка зависимостей сервера...${NC}"
        cd server && npm install && cd ..
    else
        echo -e "${GREEN}✅ Зависимости сервера установлены${NC}"
    fi
    
    # Зависимости клиента
    if [ ! -d "client/node_modules" ]; then
        echo -e "${YELLOW}🔄 Установка зависимостей клиента...${NC}"
        cd client && npm install && cd ..
    else
        echo -e "${GREEN}✅ Зависимости клиента установлены${NC}"
    fi
}

# Функция для запуска приложения
start_application() {
    echo -e "${YELLOW}🚀 Запуск приложения...${NC}"
    echo -e "${BLUE}📱 Клиент будет доступен на: http://localhost:3021${NC}"
    echo -e "${BLUE}🔌 API сервер будет доступен на: http://localhost:3020${NC}"
    echo -e "${YELLOW}⏹️  Для остановки нажмите Ctrl+C${NC}"
    echo ""
    
    npm run dev
}

# Основная логика
main() {
    # Проверяем, что мы в правильной директории
    if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
        echo -e "${RED}❌ Запустите скрипт из корневой директории проекта ixi-keeper${NC}"
        exit 1
    fi
    
    start_postgres
    setup_database
    install_dependencies
    
    echo -e "${GREEN}🎉 Все компоненты готовы к работе!${NC}"
    echo ""
    
    start_application
}

# Обработка сигнала прерывания
trap 'echo -e "\n${YELLOW}👋 Остановка приложения...${NC}"; exit 0' INT

# Запуск
main
