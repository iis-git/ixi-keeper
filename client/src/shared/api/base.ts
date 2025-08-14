import axios from 'axios';

// Определяем базовый URL API динамически
const getApiUrl = (): string => {
  // Иначе определяем автоматически на основе текущего хоста
  const currentHost = window.location.hostname;
  const apiPort = '3020';
  
  // Если localhost, используем localhost, иначе используем текущий хост
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return `http://localhost:${apiPort}/api`;
  } else {
    return `http://${currentHost}:${apiPort}/api`;
  }
};

export const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const handleApiError = (error: any): string => {
  console.error('API Error:', error);
  
  const errorDetails = {
    message: error.message,
    status: axios.isAxiosError(error) ? error.response?.status : undefined,
    statusText: axios.isAxiosError(error) ? error.response?.statusText : undefined,
    data: axios.isAxiosError(error) ? error.response?.data : undefined,
  };
  
  console.error('Error details:', errorDetails);
  return `Ошибка: ${error.message}`;
};
