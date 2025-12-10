import axios from 'axios';
import { PebbleData, Folder } from '../types';

// ★★★ 步骤1: BaseURL 统一指向服务器根目录 ★★★
// 本地: http://localhost:8002
// 线上: /pebbles/api (通过 Nginx 转发到服务器根目录 8002)
// 注意：这里不要加 /api 后缀了！
const API_URL = import.meta.env.PROD ? '/pebbles/api' : 'http://localhost:8002';

const api = axios.create({
  baseURL: API_URL,
});

// ... 拦截器部分保持不变 ...
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pebbles_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!error.config.url.includes('/auth/token')) {
        localStorage.removeItem('pebbles_token');
        window.location.reload(); 
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  // ★★★ Auth 路由保持在根目录 (不需要改) ★★★
  login: async (username: string, password: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const res = await api.post('/auth/token', formData);
    return res.data; 
  },
  register: async (username: string, password: string) => {
    const res = await api.post('/auth/register', { username, password });
    return res.data;
  },
};

// ★★★ 步骤2: 给业务接口手动加上 /api 前缀 ★★★
// 这样：
// 本地 -> http://localhost:8002/api/pebbles (正确)
// 线上 -> /pebbles/api/api/pebbles -> Nginx 去掉第一个前缀 -> /api/pebbles (正确)
export const pebbleApi = {
  getAll: async () => {
    const res = await api.get<PebbleData[]>('/api/pebbles'); // 加了 /api
    return res.data;
  },
  create: async (pebble: PebbleData) => {
    const res = await api.post('/api/pebbles', pebble); // 加了 /api
    return res.data;
  },
  update: async (id: string, updates: Partial<PebbleData>) => {
    const res = await api.put(`/api/pebbles/${id}`, updates); // 加了 /api
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/api/pebbles/${id}`); // 加了 /api
    return res.data;
  },
  generate: async (topic: string, contextPebbles: PebbleData[]) => {
    const res = await api.post<PebbleData>('/api/generate', { // 加了 /api
        topic, 
        context_pebbles: contextPebbles 
    });
    return res.data;
  },
  rewrite: async (text: string, mode: 'improve' | 'shorter' | 'longer' | 'simplify') => {
    const res = await api.post('/api/rewrite', { text, mode }); // 加了 /api
    return res.data.text;
  }
};

export const folderApi = {
  getAll: async () => {
    const res = await api.get<Folder[]>('/api/folders'); // 加了 /api
    return res.data;
  },
  create: async (folder: Folder) => {
    const res = await api.post('/api/folders', folder); // 加了 /api
    return res.data;
  },
  update: async (id: string, updates: Partial<Folder>) => {
    const res = await api.put(`/api/folders/${id}`, updates); // 加了 /api
    return res.data;
  }
};