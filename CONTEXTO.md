# Contexto do Projeto frontHotelaria

## Repositório
- **GitHub:** https://github.com/claracatarin4/frontHotelaria
- **URL pública:** http://academico3.rj.senac.br/20261prj5/hotel/
- **Projeto escolar SENAC-RJ — 2026/1**

> **Última atualização:** 2026-06-17. Sessão recente adicionou papéis de usuário
> (Cliente/Admin), painel admin de quartos e página de configurações. Detalhes na
> seção **"Sessão 2026-06-17"** ao final deste documento — leia-a antes de continuar.

---

## Repositórios do ecossistema (microsserviços)

| Papel | Repositório | Stack | Porta | Rota no gateway |
|---|---|---|---|---|
| **Front-end** | https://github.com/claracatarin4/frontHotelaria | React 19 + Vite 8 + Router 7 + Axios + Express | 9540 | `/20261prj5/hotel/` |
| MS Cliente/Usuário | https://github.com/RuanCabralBandeira/PI_hotel_cliente | Node + Restify + Prisma (MySQL) | 9531 | `/20261prj5/hotel/cliente` |
| MS Reserva | https://github.com/gzcarvalho2/PI_Hotel_Reserva | Node + Restify + Prisma (MySQL) | 9532 | `/20261prj5/hotel/reserva` |
| MS Quarto | https://github.com/claracatarin4/pi_hotel_quarto | Node + Restify + Prisma (MySQL) | 9533 | `/20261prj5/hotel/quarto` |
| MS Pagamento | https://github.com/Biglass611/api_hotel_pagamento | Node + **Express** + Prisma (MySQL) | 9534 | `/20261prj5/hotel/pagamento` |

- **Mensageria:** RabbitMQ (produtores/consumidores nos MS)
- **Secrets:** geridas via **Infisical** (workspace `bae3a521-06f2-4e1b-8d77-c410728b80d5`),
  arquivos `.infisical.json` nos MS Cliente e Quarto.
- Clones locais ficam em `R:\faculdade\` (pasta-mãe com todos os 5 repos).

### Comportamento crítico do gateway (IIS + ARR) — vale para TODOS os MS
O IIS **remove o prefixo** `/20261prj5/hotel/<servico>` antes de repassar ao container.
Ex.: `.../20261prj5/hotel/quarto/api/quartos` chega no container do quarto como `/api/quartos`.

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
    Menu/           ← landing page (rota /)
    Login/          ← autenticação JWT; redireciona por papel (rota /login)
    Cadastro/       ← cadastro de usuário (rota /cadastro)
    Home/           ← listagem de quartos com filtros e modal (rota /home, privada)
    Configuracoes/  ← perfil/conta/preferências do cliente (rota /configuracoes, privada)
  features/
    quarto/
      pages/
        Quartos.jsx        ← listagem admin (rota /admin/quartos)
        RegisterQuarto.jsx ← criar/editar quarto (rotas /admin/quartos/novo e /:id/editar)
      services/
        QuartoService.jsx  ← CRUD de quarto (paths com prefixo /api)
  context/
    AuthContext.jsx  ← JWT salvo no localStorage; expõe user.role e isAdmin
  services/
    api.js      ← 4 instâncias Axios com interceptor JWT automático
  routes/
    AppRoutes.jsx ← PrivateRoute (cliente) + AdminRoute (admin)
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
- **Papéis de usuário (Cliente/Admin)** — JWT carrega `role`, redirect pós-login por papel
- **Painel admin de quartos** — listar / criar / editar / excluir (rotas `/admin/quartos*`)
- **Página de Configurações** do cliente (abas Perfil / Conta / Preferências)

## O que FALTA implementar ❌

- [ ] Botão **"Reservar Agora"** no modal → integrar com `reservaApi` (`POST /criar`)
- [ ] Página **Minhas Reservas** → `GET /reservas` filtrando por `cliente_id` do logado
- [ ] Rota `/reservas` no AppRoutes + link no dropdown do navbar
- [ ] Fluxo de **pagamento** usando `pagamentoApi` (atentar ao auth próprio dele)
- [ ] Links da navbar: Quartos, Reservas, Serviços, Contato (atualmente sem função)
- [ ] Persistir preferências da página Configurações (hoje só visuais)
- [ ] Editar dados de perfil de verdade (precisa endpoint no MS Cliente ligando `usuario`↔`cliente`)
- [ ] **Proteção de `role` no backend** (hoje a barreira admin é só no front) — opcional, se exigido
- [ ] Upload/exibição de fotos de quarto (model `Foto` existe no MS Quarto, sem UI)

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

---

# Sessão 2026-06-17 — Papéis de usuário, painel admin e configurações

## Resumo
Adicionada distinção de papel de usuário (Cliente/Admin). O banco recebeu a coluna
`usuario_role ENUM('Cliente','Admin') NOT NULL DEFAULT 'Cliente'` na tabela `usuario`
do MS Cliente (**a coluna JÁ EXISTE no banco de produção**). A partir disso:
- **Cliente** → vê quartos, reservas e página de Configurações/Perfil.
- **Admin** → painel para criar/listar/editar/excluir quartos.
- Roteamento e redirecionamento pós-login respeitam o papel.

## Estado do código
**Commitado e PUSHADO** em 2026-06-17 (ambos os repos, branch `main`):
- `PI_hotel_cliente` → commit `feat: adicionar campo usuario_role e incluir role no JWT de login`
- `frontHotelaria` → commit `feat: roles de usuario, painel admin de quartos e pagina de configuracoes`

Validado: `vite build` passou (94 módulos) e `npx prisma generate` rodou (Prisma 5.22).
**NÃO foi testado em runtime real contra o banco** — tentativa de subir Docker local em
casa falhou (WSL2 kernel ausente / sem admin). Teste será feito na faculdade.

### Mudanças no MS Cliente (`PI_hotel_cliente`)
- `prisma/schema.prisma`: campo `usuario_role RoleEnum @default(Cliente)` + `enum RoleEnum { Cliente Admin }`.
- `src/controllers/usuario.controller.js`:
  - `login`: JWT agora `{ id, login, role }`; resposta devolve `usuario_login` e `usuario_role` além de `token`/`usuario_id`.
  - `cadastrar`: aceita `usuario_role` (sanitizado: só vira 'Admin' se vier exatamente 'Admin'); devolve `usuario_role`.
- ⚠️ Coluna já existe no banco → **NÃO criar migration**. Rodar só `npx prisma generate`.
  Se acusar drift, usar `prisma db pull` (não `migrate`).

### Mudanças no Front (`frontHotelaria`)
- `context/AuthContext.jsx`: expõe `isAdmin` (`user?.role === 'Admin'`).
- `pages/Login/Login.jsx`: salva `role`; redireciona Admin→`/admin/quartos`, Cliente→`/home`.
- `routes/AppRoutes.jsx`: novo `AdminRoute`; rotas `/configuracoes`, `/admin/quartos`, `/admin/quartos/novo`, `/admin/quartos/:id/editar`.
- `features/quarto/services/QuartoService.jsx`: CRUD completo, **todos os paths com prefixo `/api`**.
- `features/quarto/pages/RegisterQuarto.jsx` (+css): form criar/editar quarto (numero, preço, status 1/2/3, tipo). Mesma página para `/novo` e `/:id/editar` (detecta via `useParams`). Carrega tipos via `listarTiposQuarto`; fallback para digitar ID do tipo.
- `features/quarto/pages/Quartos.jsx` (+css): tabela admin com contadores, editar e excluir (confirmação inline).
- `pages/Configuracoes/Configuracoes.jsx` (+css): abas Perfil/Conta/Preferências (perfil em leitura; sair na aba Conta; toggles sem persistência).
- `pages/Home/Home.jsx`: `quartoApi.get('/quartos')` → `'/api/quartos'`; dropdown ligado (Configurações; "Painel admin" só se `isAdmin`).

## PONTOS DE ATENÇÃO (verificar ao testar na faculdade)
1. **Prefixo `/api` no MS Quarto.** Rotas reais: `/api/quartos`, `/api/tipos-quarto`. Confirmar que pelo gateway o caminho final vira `/quartos/api/quartos` → container recebe `/api/quartos`. Se diferente, ajustar paths no `QuartoService` e na `Home`.
2. **`/api/tipos-quarto`** precisa estar exposto pelo gateway para o `<select>` de tipos popular. Senão cai no fallback de digitar o ID.
3. **Contrato `criarQuarto`.** Controller faz `prisma.quarto.create({ data: req.body })`. Model espera `preco:Float, numero:String?, status:Int, tipoQuartoId:Int`. `tipoQuartoId` precisa ser FK válida.
4. **`usuario_login` no login.** Front usa `data.usuario_login` com fallback. Confirmar após deploy do MS Cliente.
5. **JWT/role nos outros MS.** Nenhum MS valida `role` hoje — proteção admin é **só no front**. Se o requisito exigir, criar middleware nos MS (o MS Pagamento tem `src/middlewares/auth.js` de referência).
6. **MS Pagamento usa Express** (não Restify), prefixos `/auth`, `/pagamentos`, `/boletos`, `/depositos`, `/cartoes`, `/tipo-pagamento`, quase tudo sob `auth`.

## Contratos de API reais (lidos do código dos MS)

### MS Cliente (Restify, 9531) — gateway `/cliente`
- `POST /usuario/cadastrar` — `{ usuario_login, usuario_senha, usuario_role? }` → 201 `{ mensagem, usuario_id, usuario_login, usuario_role }`
- `POST /usuario/login` — `{ usuario_login, usuario_senha }` → 200 `{ mensagem, token, usuario_id, usuario_login, usuario_role }`
- `GET /` · `GET /:id` · `POST /` · `PUT|PATCH /:id` · `PATCH /:id/excluir` (soft delete) · `GET /cliente/reservas`
- Models: `Usuario{ usuario_id, usuario_login(unique), usuario_senha, usuario_status[Ativo|Inativo], usuario_role[Cliente|Admin] }`, `Cliente{ cliente_id, cliente_nome, cliente_idade, cliente_genero, cliente_cpf(unique), cliente_telefone, cliente_status, usuario_id(FK), quarto_id? }`

### MS Quarto (Restify, 9533) — gateway `/quarto` ⚠ prefixo `/api`
- `GET /api/quartos` (inclui `tipoQuarto` e `fotos`) · `GET /api/quartos/preco?minPreco=&maxPreco=` · `GET /api/quartos/:id`
- `POST /api/quartos` — `{ preco, numero?, status, tipoQuartoId }` · `PUT|PATCH /api/quartos/:id` · `DELETE /api/quartos/:id`
- `GET /api/tipos-quarto` · `GET|POST|PUT|PATCH|DELETE /api/tipos-quarto/:id`
- Eventos RabbitMQ: `QUARTO_CRIADO`, `QUARTO_ATUALIZADO`, `QUARTO_PATCH`, `QUARTO_REMOVIDO`
- Models: `TipoQuarto{ id, descricao, status? }`, `Quarto{ id, preco:Float, numero:String?, status:Int, tipoQuartoId:Int }`, `Foto{...}`
- Status no front: `1=Disponível, 2=Ocupado, 3=Manutenção`

### MS Reserva (Restify, 9532) — gateway `/reserva`
- `GET /reservas` · `GET /reservas/:id` · `POST /criar` · `PUT /reservas/:id` · `DELETE /reservas/:id`
- `POST /criar`: `{ reserva_checkin, reserva_checkout, reserva_status, cliente_id, quarto_id, pagamento_status, tipo_quarto_id }`
- Valida cliente e disponibilidade do quarto (axios síncrono) antes de criar.

### MS Pagamento (Express, 9534) — gateway `/pagamento`
- `POST /auth/login` (auth próprio) · `GET|POST /pagamentos`, `GET|PUT|PATCH|DELETE /pagamentos/:id` (sob `auth`)
- Também `/boletos`, `/depositos`, `/cartoes`, `/tipo-pagamento`, `/api-docs` (Swagger)
- `POST /pagamentos`: `{ pagamento_tipo, pagamento_status, pagamento_data, pagamento_endereco }`

## Próximo passo imediato
Testar na faculdade o fluxo: login Admin → criar quarto → ver na Home; login Cliente → Configurações.
Validar especialmente o prefixo `/api` através do gateway (ponto de atenção 1).
