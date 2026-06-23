import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1', timeout: 15000 });

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('cosaki-auth');
  if (raw) {
    const { state } = JSON.parse(raw);
    if (state?.accessToken) {
      config.headers.Authorization = `Bearer ${state.accessToken}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const raw = localStorage.getItem('cosaki-auth');
        const { state } = JSON.parse(raw);
        const { data } = await axios.post('/api/v1/auth/refresh', {
          refreshToken: state.refreshToken,
        });
        const store = JSON.parse(localStorage.getItem('cosaki-auth'));
        store.state.accessToken = data.data.accessToken;
        localStorage.setItem('cosaki-auth', JSON.stringify(store));
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('cosaki-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
