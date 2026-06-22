import { pagamentoApi } from './api';

// Token pré-gerado (HS256, expira em 1 ano) — renovar via VITE_PAGAMENTO_TOKEN no docker-compose
const getPaymentToken = () =>
  import.meta.env.VITE_PAGAMENTO_TOKEN ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3VhcmlvIjoiaG90ZWxfZnJvbnQiLCJleHAiOjE4MTMzMjc3NjJ9.WhDjRNe1Uhz5ibFAgcd4V_4bhJd66MAM_-9fddyzc68';

const authHeader = () => ({ Authorization: `Bearer ${getPaymentToken()}` });

export const criarPagamento = async (payload) => {
  const { data } = await pagamentoApi.post('/pagamentos', payload, {
    headers: authHeader(),
  });
  return data;
};

export const criarCartao = async (payload) => {
  const { data } = await pagamentoApi.post('/cartoes', payload, {
    headers: authHeader(),
  });
  return data;
};

export const criarBoleto = async (payload) => {
  const { data } = await pagamentoApi.post('/boletos', payload, {
    headers: authHeader(),
  });
  return data;
};

export const criarDeposito = async (payload) => {
  const { data } = await pagamentoApi.post('/depositos', payload, {
    headers: authHeader(),
  });
  return data;
};

export const criarTipoPagamento = async (payload) => {
  const { data } = await pagamentoApi.post('/tipo-pagamento', payload, {
    headers: authHeader(),
  });
  return data;
};

// Dispara o processamento assíncrono (gateway simulado). Responde com { aprovado, motivo, estimativa_ms }.
export const processarPagamento = async (payload) => {
  const { data } = await pagamentoApi.post('/pagamentos/processar', payload, {
    headers: authHeader(),
  });
  return data;
};
