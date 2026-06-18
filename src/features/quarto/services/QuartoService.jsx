import { quartoApi } from "../../../services/api";

export const listarQuartos = async (params = {}) => {
  const { data } = await quartoApi.get("/api/quartos", { params });
  return data;
};

export const buscarQuarto = async (id) => {
  const { data } = await quartoApi.get(`/api/quartos/${id}`);
  return data;
};

export const criarQuarto = async (payload) => {
  const { data } = await quartoApi.post("/api/quartos", payload);
  return data;
};

export const atualizarQuarto = async (id, payload) => {
  const { data } = await quartoApi.put(`/api/quartos/${id}`, payload);
  return data;
};

export const editarParcialQuarto = async (id, payload) => {
  const { data } = await quartoApi.patch(`/api/quartos/${id}`, payload);
  return data;
};

export const excluirQuarto = async (id) => {
  const { data } = await quartoApi.delete(`/api/quartos/${id}`);
  return data;
};

// Tipos de quarto
export const listarTiposQuarto = async () => {
  const { data } = await quartoApi.get("/api/tipos-quarto");
  return data;
};

export const criarTipoQuarto = async (payload) => {
  const { data } = await quartoApi.post("/api/tipos-quarto", payload);
  return data;
};

export const atualizarTipoQuarto = async (id, payload) => {
  const { data } = await quartoApi.put(`/api/tipos-quarto/${id}`, payload);
  return data;
};

export const excluirTipoQuarto = async (id) => {
  const { data } = await quartoApi.delete(`/api/tipos-quarto/${id}`);
  return data;
};

// Fotos
export const listarFotosQuarto = async (quartoId) => {
  const { data } = await quartoApi.get(`/api/quartos/${quartoId}/fotos`);
  return data;
};

export const criarFotoQuarto = async (quartoId, payload) => {
  const { data } = await quartoApi.post(`/api/quartos/${quartoId}/fotos`, payload);
  return data;
};

export const excluirFoto = async (fotoId) => {
  const { data } = await quartoApi.delete(`/api/fotos/${fotoId}`);
  return data;
};
