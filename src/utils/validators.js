// Utilitários de máscara e validação de dados de cliente.
// Padrão do banco: CPF "000.000.000-00" e telefone "(00) 00000-0000".

export const apenasDigitos = (v = '') => String(v).replace(/\D/g, '');

// Máscara progressiva de CPF: 000.000.000-00 (limita a 11 dígitos)
export function maskCPF(v) {
  const d = apenasDigitos(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// Máscara de telefone: (00) 0000-0000 (fixo) ou (00) 00000-0000 (celular)
export function maskTelefone(v) {
  const d = apenasDigitos(v).slice(0, 11);
  if (!d) return '';
  let out = '(' + d.slice(0, 2);
  if (d.length >= 2) out += ') ';
  if (d.length <= 10) {
    out += d.slice(2, 6);
    if (d.length > 6) out += '-' + d.slice(6, 10);
  } else {
    out += d.slice(2, 7);
    if (d.length > 7) out += '-' + d.slice(7, 11);
  }
  return out;
}

// Valida CPF por formato (11 dígitos) + dígitos verificadores
export function validarCPF(v) {
  const c = apenasDigitos(v);
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false; // rejeita 111.111.111-11 etc.

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(c[i], 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(c[9], 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(c[i], 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(c[10], 10)) return false;

  return true;
}

// Telefone válido = 10 (fixo) ou 11 (celular) dígitos
export function validarTelefone(v) {
  const d = apenasDigitos(v);
  return d.length === 10 || d.length === 11;
}
