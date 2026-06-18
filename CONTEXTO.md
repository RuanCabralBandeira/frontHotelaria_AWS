# Contexto do Projeto frontHotelaria

## Repositório
- **GitHub:** https://github.com/claracatarin4/frontHotelaria
- **URL pública:** http://academico3.rj.senac.br/20261prj5/hotel/
- **Projeto escolar SENAC-RJ — 2026/1**

> **Última atualização:** 2026-06-18. Sessão recente corrigiu o fluxo de reserva/pagamento,
> implementou o painel admin completo (fotos + tipos de quarto) e descobriu um problema de
> 502 no MS Cliente após redeploy. Detalhes na seção **"Sessão 2026-06-18"** ao final.

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

### Problema recorrente: IIS perde rota após redeploy de containers
Quando Jenkins rebuilda um container Docker, o container reinicia com novo IP interno.
O IIS/ARR não atualiza o IP automaticamente → retorna **500 "URL Rewrite Module Error"** para
**todas** as rotas do site. **Solução: `iisreset`** no servidor pelo técnico de TI do SENAC.

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
    Menu/             ← landing page (rota /)
    Login/            ← autenticação JWT; redireciona por papel (rota /login)
    Cadastro/         ← cadastro de usuário (rota /cadastro)
    Home/             ← listagem de quartos com filtros, modal e ReservaModal (rota /home, privada)
    Configuracoes/    ← perfil/conta/preferências do cliente (rota /configuracoes, privada)
    MinhasReservas/   ← histórico de reservas do cliente (rota /reservas, privada)
  features/
    quarto/
      pages/
        Quartos.jsx        ← listagem admin com thumbnail e 4 stats (rota /admin/quartos)
        RegisterQuarto.jsx ← criar/editar quarto + upload de foto base64 (rotas /admin/quartos/novo e /:id/editar)
        TiposQuarto.jsx    ← CRUD inline de tipos de quarto (rota /admin/tipos-quarto)
      services/
        QuartoService.jsx  ← CRUD de quarto + fotos (criar/listar/excluir) + tipos (CRUD completo)
  context/
    AuthContext.jsx  ← JWT salvo no localStorage; expõe user.role e isAdmin; busca clienteId no MS Cliente
  services/
    api.js           ← 4 instâncias Axios com interceptor JWT automático
    reservaService.js
    pagamentoService.js ← token próprio via VITE_PAGAMENTO_TOKEN (JWT separado)
  routes/
    AppRoutes.jsx ← PrivateRoute (cliente) + AdminRoute (admin)
  utils/
    formatCurrency.js / formatDate.js / validators.js
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
- Modal de detalhe do quarto com amenidades
- **ReservaModal**: fluxo completo em 4 steps (datas → pagamento → confirmando → concluído)
  - Integrado com MS Reserva (`POST /criar`) e MS Pagamento
  - Suporta cartão, boleto e depósito
  - Polling de confirmação de reserva
- Navbar com dropdown de usuário (avatar, nome, logout, Minhas Reservas, Painel Admin se admin)
- Rota privada (PrivateRoute) protegendo `/home`, `/reservas`, `/configuracoes`
- Deploy funcionando no Jenkins/Docker/IIS
- **Papéis de usuário (Cliente/Admin)** — JWT carrega `role`, redirect pós-login por papel
- **Painel admin de quartos** — listar / criar / editar / excluir
  - Thumbnail da primeira foto na tabela
  - Stats: total, disponíveis, ocupados, em manutenção
  - Nav com links Quartos / Tipos de quarto
- **Upload de foto de quarto** — compressão canvas (JPEG 70%, max 800px) → base64 → `POST /api/quartos/:id/fotos`
  - Grid de fotos existentes com exclusão inline (no modo editar carrega junto com o quarto)
  - No modo criar: seção de fotos aparece após o quarto ser salvo
- **Tipos de quarto** — CRUD inline em `/admin/tipos-quarto` (criar via form, editar in-place, excluir com confirmação)
- **Página de Configurações** do cliente (abas Perfil / Conta / Preferências)
- **Minhas Reservas** — listagem com filtro por `cliente_id`

## O que FALTA implementar ❌

- [ ] MS Cliente retornando 502 no login após último redeploy — **investigar** (ver seção abaixo)
- [ ] Fotos reais na Home (hoje usa placeholder Unsplash; quarto já tem `fotos[]` na resposta da API)
- [ ] Links da navbar: Quartos, Reservas, Serviços, Contato (atualmente sem função)
- [ ] Persistir preferências da página Configurações (hoje só visuais)
- [ ] Editar dados de perfil de verdade (precisa endpoint no MS Cliente ligando `usuario`↔`cliente`)
- [ ] **Proteção de `role` no backend** (hoje a barreira admin é só no front) — opcional, se exigido
- [ ] Upload/exibição de fotos na Home (infra pronta no admin, falta usar na listagem pública)

---

## Bugs já resolvidos (não repetir)

| Sintoma | Causa | Fix aplicado |
|---|---|---|
| ERR_TOO_MANY_REDIRECTS | Vite dev server redirecionava `/` → `/20261prj5/hotel/` em loop com IIS | Build estático + Express |
| 502 Bad Gateway | Vite rodando na porta 5173, Docker expunha 9540 | `strictPort: true` no vite.config |
| `serve: command not found` | `serve` em devDependencies não estava no PATH do container | Substituído por Express |
| `PathError: Missing parameter name: *` | `app.get('*')` incompatível com path-to-regexp v8 (Express 5) | Trocado por `app.use()` |
| docker-compose ignorava Dockerfile | Campo `command:` no docker-compose sobrescreve `CMD` do Dockerfile | Atualizado `command:` no docker-compose |
| Loop de redirect mesmo com base correto | `base: '/'` gerava assets sem prefixo (404) | Usar build + Express (não dev server) |
| 500 no `POST /tipo-pagamento` | `reserva_id` estava ausente no `schema.prisma` do MS Pagamento (coluna NOT NULL no banco) | Adicionado `reserva_id Int` ao schema + controller; front passa `reserva_id: rId` no payload |
| 500 "URL Rewrite Module Error" em todo o site | Containers Docker reiniciaram com novo IP; IIS/ARR com IP antigo em cache | `iisreset` no servidor pelo técnico de TI |

---

## Contratos de API reais (lidos do código dos MS)

### MS Cliente (Restify, 9531) — gateway `/cliente`
- `POST /usuario/cadastrar` — `{ usuario_login, usuario_senha, usuario_role? }` → 201 `{ mensagem, usuario_id, usuario_login, usuario_role }`
- `POST /usuario/login` — `{ usuario_login, usuario_senha }` → 200 `{ mensagem, token, usuario_id, usuario_login, usuario_role }`
- `GET /` · `GET /:id` · `POST /` · `PUT|PATCH /:id` · `PATCH /:id/excluir` (soft delete) · `GET /cliente/reservas`
- Models: `Usuario{ usuario_id, usuario_login(unique), usuario_senha, usuario_status[Ativo|Inativo], usuario_role[Cliente|Admin] }`, `Cliente{ cliente_id, cliente_nome, cliente_idade, cliente_genero, cliente_cpf(unique), cliente_telefone, cliente_status, usuario_id(FK), quarto_id? }`

### MS Quarto (Restify, 9533) — gateway `/quarto` ⚠ prefixo `/api`
- `GET /api/quartos` (inclui `tipoQuarto` e `fotos`) · `GET /api/quartos/preco?minPreco=&maxPreco=` · `GET /api/quartos/:id`
- `POST /api/quartos` — `{ preco, numero?, status, tipoQuartoId }` · `PUT|PATCH /api/quartos/:id` · `DELETE /api/quartos/:id`
- `GET /api/tipos-quarto` · `POST /api/tipos-quarto` — `{ descricao, status? }` · `PUT|PATCH|DELETE /api/tipos-quarto/:id`
- `GET /api/quartos/:quartoId/fotos` · `POST /api/quartos/:quartoId/fotos` — `{ foto_bin, foto_nome, foto_extensao, foto_status? }`
- `DELETE /api/fotos/:fotoId`
- `foto_bin`: string base64 pura (sem prefixo `data:...`); `foto_extensao`: ex `"jpg"`; `foto_nome`: max 45 chars
- Models: `TipoQuarto{ id, descricao, status? }`, `Quarto{ id, preco:Float, numero:String?, status:Int, tipoQuartoId:Int }`, `Foto{ foto_id, foto_bin:MediumText, foto_nome, foto_extensao, foto_status, quarto_id }`
- Status: `1=Disponível, 2=Ocupado, 3=Manutenção`

### MS Reserva (Restify, 9532) — gateway `/reserva`
- `GET /reservas` · `GET /reservas/:id` · `POST /criar` · `PUT /reservas/:id` · `DELETE /reservas/:id`
- `POST /criar`: `{ reserva_checkin, reserva_checkout, reserva_status, cliente_id, quarto_id, pagamento_status, tipo_quarto_id }`
- Valida cliente e disponibilidade do quarto (axios síncrono) antes de criar.

### MS Pagamento (Express, 9534) — gateway `/pagamento`
- `POST /auth/login` (auth próprio) · `GET|POST /pagamentos`, `GET|PUT|PATCH|DELETE /pagamentos/:id`
- `POST /pagamentos` — `{ pagamento_tipo, pagamento_status, pagamento_data, pagamento_endereco }`
- `POST /cartoes` — `{ cartao_numero, cartao_validade, cartao_cvv, cartao_banco, cartao_nome, cartao_status }`
- `POST /boletos` — `{ boleto_numero, boleto_vencimento, boleto_emissao, boleto_status }`
- `POST /depositos` — `{ deposito_banco, deposito_valor, deposito_agencia, deposito_conta, deposito_status }`
- `POST /tipo-pagamento` — `{ pagamento_id, reserva_id, tipo_pagamento_status, cartao_id? | boleto_id? | deposito_id? }`
  ⚠ `reserva_id` é **obrigatório** — campo NOT NULL no banco, adicionado ao schema em 2026-06-18
- Token próprio: `VITE_PAGAMENTO_TOKEN` no docker-compose do front (ou token hardcoded no pagamentoService.js)

---

# Sessão 2026-06-18 — Reserva/Pagamento, Painel Admin e Fotos

## Resumo
Corrigido o fluxo completo de reserva + pagamento que retornava 500. Implementado painel admin
completo com upload de foto (base64) e CRUD de tipos de quarto. Descoberto problema de 502 no
MS Cliente após redeploy, ainda não resolvido.

## Fixes no MS Pagamento (`api_hotel_pagamento`)

### Commits
- `681de52` — Removido `reserva_id` da validação do controller (era obrigatório mas não existia no schema Prisma) — **esse fix estava errado**
- `56f042d` — Corrigido de verdade: `reserva_id Int` adicionado ao `schema.prisma` (coluna é NOT NULL no banco) + controller create/update/patch

### Causa raiz
O banco tinha `reserva_id NOT NULL` na tabela `tipo_pagamento`, mas o campo estava ausente do
`schema.prisma`. O Prisma gerava INSERT sem a coluna → `P2011 Null constraint violation`.

### Fix no front (`frontHotelaria`)
- Commit `0170c77` — `ReservaModal.jsx`: `criarTipoPagamento` agora inclui `reserva_id: rId` no payload

## Painel Admin — Fotos e Tipos de Quarto (`frontHotelaria`)

### Commit `27cf994`
**`QuartoService.jsx`**: novos métodos — `listarFotosQuarto`, `criarFotoQuarto`, `excluirFoto`,
`criarTipoQuarto`, `atualizarTipoQuarto`, `excluirTipoQuarto`

**`Quartos.jsx`**: thumbnail da primeira foto na tabela; 4 stat cards (total/disponíveis/ocupados/manutenção);
nav com links "Quartos" / "Tipos de quarto"

**`RegisterQuarto.jsx`**: seção de fotos abaixo do form principal:
- Compressão canvas antes do upload: JPEG 70%, max 800px largura → base64 puro (sem prefixo data:)
- Modo criar: seção aparece após `criarQuarto` retornar o ID; botão "Concluir" para voltar à lista
- Modo editar: fotos carregadas do `buscarQuarto` (já vêm no `include`); add/delete imediatos (sem precisar salvar o form)
- Grid de fotos com hover → overlay com nome e botão ✕

**`TiposQuarto.jsx`** (novo): CRUD inline — form no topo para criar, tabela com edição in-place
(Enter confirma, Escape cancela) e exclusão com confirmação

**`AppRoutes.jsx`**: rota `/admin/tipos-quarto` protegida por `AdminRoute`

## Problema atual: MS Cliente 502 no login

### Sintoma
Após redeploy do MS Cliente (para incluir `usuario_role` no schema Prisma e JWT),
`POST /usuario/login` leva 21 segundos e retorna 502. O container está `running` no Yatch
e o RabbitMQ conecta normalmente no startup.

### Diagnóstico provável
Timeout de conexão com o banco MySQL. O novo container (com Prisma client regenerado) pode
estar demorando para estabelecer a conexão com o DB, ou a `DATABASE_URL` está com problema.

### Estado do código do MS Cliente
O código está correto — `usuario.controller.js` lê `usuario.usuario_role` e inclui no JWT e na
resposta. O `schema.prisma` tem `usuario_role RoleEnum @default(Cliente)` com enum `{ Cliente Admin }`.
**Não mexer no código — investigar a conexão com o banco.**

### O que verificar
1. Logs do container no Yatch **durante** uma tentativa de login (não apenas no startup)
2. Se a `DATABASE_URL` está correta no `.env` / docker-compose do MS Cliente
3. Se o banco MySQL aceita conexão do novo container (pool de conexões, firewall interno)

## PONTOS DE ATENÇÃO (manter em mente)

1. **Prefixo `/api` no MS Quarto.** Todas as rotas: `/api/quartos`, `/api/tipos-quarto`, `/api/fotos/:id`
2. **`foto_bin` sem prefixo.** Armazenar base64 puro; ao exibir, prefixar com `data:image/${ext};base64,`
3. **`reserva_id` obrigatório no tipo-pagamento.** Não remover do payload.
4. **`clienteId` pode ser undefined.** `AuthContext` busca via `GET /` no MS Cliente filtrando por `usuario_id`. Se falhar, `cliente_id` vai undefined no payload de reserva.
5. **IIS precisa de `iisreset` após redeploy de containers.** Avisar o técnico de TI do SENAC toda vez que fizer rebuild.
6. **JWT_SECRET** deve estar nas env vars do MS Cliente — se ausente, `jwt.sign` joga erro e o login retorna 500.
