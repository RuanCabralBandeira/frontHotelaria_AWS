# Contexto do Projeto frontHotelaria

## Repositório
- **GitHub:** https://github.com/claracatarin4/frontHotelaria
- **URL pública:** http://academico3.rj.senac.br/20261prj5/hotel/
- **Projeto escolar SENAC-RJ — 2026/1**

---

## Stack

- React 19 + Vite 8
- React Router DOM 7
- Axios
- Express (servidor de produção)

---

## Infraestrutura de Deploy

| Camada | Tecnologia |
|---|---|
| CI/CD | Jenkins (Linux) |
| Container | Docker `node:20`, porta `9540` |
| Proxy reverso | Microsoft IIS com ARR 3.0 |

### Comportamento crítico do IIS ARR
O IIS **remove o prefixo** `/20261prj5/hotel` antes de repassar para o container.  
Exemplo: `academico3.rj.senac.br/20261prj5/hotel/assets/main.js` → chega no container como `/assets/main.js`

---

## Como o Deploy Funciona (solução atual)

O Vite dev server **não pode ser usado em produção** aqui porque ele redireciona `/` → `/20261prj5/hotel/` (loop infinito com o IIS).

**Solução:** `vite build` + Express servindo o `dist/` estático.

```
docker-compose command: sh -c "npm run build && npm start"
                                      ↓                ↓
                               gera dist/        node server.js
```

### Arquivos-chave de configuração

**`vite.config.js`**
```js
base: '/20261prj5/hotel/',   // assets gerados com prefixo completo
port: 9540,
strictPort: true,
host: true
```

**`server.js`** (Express)
```js
app.use(express.static('dist'))           // serve assets
app.use((_req, res) => res.sendFile('dist/index.html'))  // SPA fallback
// IMPORTANTE: não usar app.get('*') — quebra com path-to-regexp v8
```

**`src/routes/AppRoutes.jsx`**
```jsx
<BrowserRouter basename="/20261prj5/hotel">
// basename necessário porque o browser vê a URL completa
```

**`docker-compose.yml`**
```yaml
command: sh -c "npm run build && npm start"
# O campo 'command' sobrescreve o CMD do Dockerfile
```

---

## Estrutura do Projeto

```
src/
  pages/
    Menu/       ← landing page (rota /)
    Login/      ← autenticação JWT (rota /login)
    Cadastro/   ← cadastro de usuário (rota /cadastro)
    Home/       ← listagem de quartos com filtros e modal (rota /home, privada)
  context/
    AuthContext.jsx  ← JWT salvo no localStorage
  services/
    api.js      ← 4 instâncias Axios com interceptor JWT automático
  routes/
    AppRoutes.jsx
```

## APIs do Backend

| Instância | URL base |
|---|---|
| `usuarioApi` | `/20261prj5/hotel/cliente` |
| `quartoApi` | `/20261prj5/hotel/quarto` |
| `reservaApi` | `/20261prj5/hotel/reserva` |
| `pagamentoApi` | `/20261prj5/hotel/pagamento` |

---

## O que está PRONTO ✅

- Landing page (Menu) com hero, stats e seção de features
- Login com JWT, show/hide senha, tratamento de erro da API
- Cadastro de usuário
- Home: listagem de quartos via API, filtros por status e tipo, skeleton loading, estado vazio/erro
- Modal de quarto com detalhes, amenidades e resumo de compra (UI)
- Navbar com dropdown de usuário (avatar, nome, logout)
- Rota privada (PrivateRoute) protegendo `/home`
- Deploy funcionando no Jenkins/Docker/IIS

## O que FALTA implementar ❌

- [ ] Botão **"Reservar Agora"** no modal → integrar com `reservaApi` (criar reserva)
- [ ] Página **Minhas Reservas** → listar reservas do usuário logado via `reservaApi`
- [ ] Rota `/reservas` no AppRoutes + link no dropdown do navbar
- [ ] Fluxo de **pagamento** usando `pagamentoApi`
- [ ] Links da navbar: Quartos, Reservas, Serviços, Contato (atualmente sem função)

---

## Bugs já resolvidos (não repetir)

| Sintoma | Causa | Fix aplicado |
|---|---|---|
| ERR_TOO_MANY_REDIRECTS | Vite dev server redirecionava `/` → `/20261prj5/hotel/` em loop com IIS | Build estático + Express |
| 502 Bad Gateway | Vite rodando na porta 5173, Docker expunha 9540 | `strictPort: true` no vite.config |
| `serve: command not found` | `serve` em devDependencies não estava no PATH do container | Substituído por Express |
| `PathError: Missing parameter name: *` | `app.get('*')` incompatível com path-to-regexp v8 (Express 5) | Trocado por `app.use()` |
| docker-compose ignorava Dockerfile | Campo `command:` no docker-compose sobrescreve `CMD` do Dockerfile | Atualizado `command:` no docker-compose |
| Loop de redirect mesmo com base correto | `base: '/'` gerava assets sem prefixo (404); `base: '/20261prj5/hotel/'` causava loop | Usar build + Express (não dev server) |
