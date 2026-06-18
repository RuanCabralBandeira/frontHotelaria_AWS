import { reservaApi } from './api';

export const criarReserva = async (payload) => {
  const { data } = await reservaApi.post('/criar', payload);
  return data;
};

export const buscarReserva = async (id) => {
  const { data } = await reservaApi.get(`/reservas/${id}`);
  return data;
};

export const atualizarReserva = async (id, payload) => {
  const { data } = await reservaApi.put(`/reservas/${id}`, payload);
  return data;
};

export const listarReservas = async () => {
  const { data } = await reservaApi.get('/reservas');
  return data;
};
