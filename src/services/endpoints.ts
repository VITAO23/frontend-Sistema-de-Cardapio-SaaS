export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api-saas-sistema-cardapio.onrender.com';

export const API_ENDPOINTS = {
  LOGIN: '/login',
  REGISTER: '/register',
  USERS_ME: '/users/me',
  UPLOAD_AVATAR: '/users/me/avatar',
  CHANGE_PASSWORD: '/users/me/password',
  PRODUCTS: '/products',
  PRODUCT: (id: string) => `/products/${id}`,
  CATEGORIES: '/categories',
  CATEGORY: (id: string) => `/categories/${id}`,
  RESTAURANT: '/restaurants/me',
  RESTAURANT_LOGO: '/restaurants/me/logo',
};

export const EXTERNAL_APIS = {
  VIACEP: 'https://viacep.com.br/ws',
};
