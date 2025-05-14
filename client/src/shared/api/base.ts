import axios from 'axios';

export const API_URL = 'http://localhost:3000/api';

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
