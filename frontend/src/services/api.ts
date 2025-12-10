// services/api.ts
import axios from 'axios';
import { PebbleData, Folder, GenerationTask } from '../types';

const API_URL = 'http://localhost:8000'; // 对应 FastAPI 地址

const api = axios.create({
  baseURL: API_URL,
});

// 请求拦截器：自动注入 Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pebbles_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理 Token 过期
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('pebbles_token');
      window.location.reload(); // 强制登出
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (username: string, password: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const res = await api.post('/auth/token', formData);
    return res.data; // { access_token, token_type }
  },
  register: async (username: string, password: string) => {
    const res = await api.post('/auth/register', { username, password });
    return res.data;
  },
};

export const pebbleApi = {
  getAll: async () => {
    const res = await api.get<PebbleData[]>('/api/pebbles');
    return res.data;
  },
  create: async (pebble: PebbleData) => {
    const res = await api.post('/api/pebbles', pebble);
    return res.data;
  },
  update: async (id: string, updates: Partial<PebbleData>) => {
    const res = await api.put(`/api/pebbles/${id}`, updates);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/api/pebbles/${id}`);
    return res.data;
  },
  // 生成逻辑移交后端
  generate: async (topic: string, contextPebbles: PebbleData[]) => {
    // 注意：后端 ai.py 接收 context_pebbles (snake_case) 还是 camelCase 取决于 Pydantic 设置
    // 这里假设后端接收 json body
    const res = await api.post<PebbleData>('/api/generate', { 
        topic, 
        context_pebbles: contextPebbles 
    });
    return res.data;
  },
  // ★★★ 新增：改写文本方法 ★★★
  rewrite: async (text: string, mode: 'improve' | 'shorter' | 'longer' | 'simplify') => {
    const res = await api.post('/api/rewrite', { text, mode });
    return res.data.text; // 返回字符串
  }
};

export const folderApi = {
  getAll: async () => {
    const res = await api.get<Folder[]>('/api/folders');
    return res.data;
  },
  create: async (folder: Folder) => {
    const res = await api.post('/api/folders', folder);
    return res.data;
  },
  // ★★★ 新增：更新文件夹方法 ★★★
  update: async (id: string, updates: Partial<Folder>) => {
    const res = await api.put(`/api/folders/${id}`, updates);
    return res.data;
  }
};