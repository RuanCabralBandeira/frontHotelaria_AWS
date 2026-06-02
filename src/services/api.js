import axios from "axios";

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