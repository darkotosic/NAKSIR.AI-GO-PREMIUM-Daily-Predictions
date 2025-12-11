import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'https://naksir-go-premium-api.onrender.com',
  timeout: 15000,
});
