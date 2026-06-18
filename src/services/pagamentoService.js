import { pagamentoApi } from './api';

const getPaymentToken = async () => {
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}api/payment-token`, { method: 'POST' });
  if (!res.ok) throw new Error('Falha ao obter token de pagamento');
  const { token } = await res.json();
  return token;
};

const authHeader = async () => {
  const token = await getPaymentToken();
  return { Authorization: `Bearer ${token}` };
};

export const criarPagamento = async (payload) => {
  const { data } = await pagamentoApi.post('/pagamentos', payload, {
    headers: await authHeader(),
  });
  return data;
};

export const criarCartao = async (payload) => {
  const { data } = await pagamentoApi.post('/cartoes', payload, {
    headers: await authHeader(),
  });
  return data;
};

export const criarBoleto = async (payload) => {
  const { data } = await pagamentoApi.post('/boletos', payload, {
    headers: await authHeader(),
  });
  return data;
};

export const criarDeposito = async (payload) => {
  const { data } = await pagamentoApi.post('/depositos', payload, {
    headers: await authHeader(),
  });
  return data;
};

export const criarTipoPagamento = async (payload) => {
  const { data } = await pagamentoApi.post('/tipo-pagamento', payload, {
    headers: await authHeader(),
  });
  return data;
};
