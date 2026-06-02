import { quartoApi } from "../../../services/api";

export const listarQuartos = async () => {
  const { data } = await quartoApi.get("/quartos");
  return data;
};

export const buscarQuarto = async (id) => {
  const { data } = await quartoApi.get(`/quartos/${id}`);
  return data;
};

export const criarQuarto = async (payload) => {
  const { data } = await quartoApi.post("/quartos", payload);
  return data;
};

export const excluirQuarto = async (id) => {
  const { data } = await quartoApi.delete(`/quartos/${id}`);
  return data;
};