import axios from 'axios';

export const usuarioApi = axios.create({
  baseURL: import.meta.env.VITE_USUARIO_API,
});

export const quartoApi = axios.create({
  baseURL: import.meta.env.VITE_QUARTO_API,
});

export const reservaApi = axios.create({
  baseURL: import.meta.env.VITE_RESERVA_API,
});

export const pagamentoApi = axios.create({
  baseURL: import.meta.env.VITE_PAGAMENTO_API,
});

// Request: injeta o JWT do usuário logado em todas as chamadas
const addAuthInterceptor = (instance) => {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
};

// Endpoints públicos onde 401 é esperado (login/cadastro) e NÃO deve redirecionar
const isAuthEndpoint = (url = '') =>
  /\/usuario\/login|\/usuario\/cadastrar|\/auth\/login/.test(url);

// Response: trata 401 (sessão inválida/expirada) -> limpa e manda pro login.
// 403 (sem permissão) é repassado para o componente exibir "acesso negado".
const addResponseInterceptor = (instance) => {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;
      const url = error.config?.url || '';
      if (status === 401 && !isAuthEndpoint(url)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.endsWith('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
};

[usuarioApi, quartoApi, reservaApi, pagamentoApi].forEach((api) => {
  addAuthInterceptor(api);
  addResponseInterceptor(api);
});
