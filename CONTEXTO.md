# Contexto do Projeto frontHotelaria

## Repositório
- **GitHub:** https://github.com/claracatarin4/frontHotelaria
- **URL pública:** http://academico3.rj.senac.br/20261prj5/hotel/
- **Projeto escolar SENAC-RJ — 2026/1**

> **Última atualização:** 2026-06-22. Sessão recente inverteu o fluxo de reserva
> (escolher datas → ver quartos livres), adicionou validação de overbooking no MS Reserva,
> transformou o pagamento em assíncrono (gateway simulado via RabbitMQ), criou o dashboard
> admin de reservas, **repovoou o banco com 48 quartos + fotos** (scripts de seed/reset),
> adicionou **máscara/validação de CPF e telefone** (front + MS Cliente), parou de armazenar
> o cartão real no MS Pagamento (**máscara + hash, CVV descartado**) e implementou
> **autenticação JWT + autorização por role nos 4 microsserviços** (controle de acesso real).
> Detalhes na seção **"Sessão 2026-06-22"** ao final. O 502 no login do MS Cliente segue
> pendente (ver seção "Sessão 2026-06-18").

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
    reserva/
      pages/
        ReservasAdmin.jsx  ← dashboard admin de reservas (rota /admin/reservas)
  context/
    AuthContext.jsx  ← JWT salvo no localStorage; expõe user.role e isAdmin; busca clienteId no MS Cliente
  services/
    api.js           ← 4 instâncias Axios com interceptor JWT automático
    reservaService.js
    clienteService.js   ← listarClientes/buscarCliente (MS Cliente)
    pagamentoService.js ← token próprio via VITE_PAGAMENTO_TOKEN (JWT separado); processarPagamento
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
- **Home com fluxo por data** — usuário escolhe check-in/check-out e só então vê os quartos
  livres no período (cruza `GET /api/quartos` + `GET /reservas` filtrando sobreposição de datas);
  filtro por tipo; skeleton loading; estado vazio/erro
- Modal de detalhe do quarto com amenidades
- **ReservaModal**: fluxo em steps (datas → pagamento → confirmando → concluído/recusado)
  - Datas já vêm da Home (pula a etapa de datas, abre direto no pagamento)
  - Integrado com MS Reserva (`POST /criar`) e MS Pagamento
  - Suporta cartão, boleto e depósito
  - **Pagamento assíncrono**: dispara o gateway simulado e faz polling do status real
    (2=confirmada, 3=recusada com motivo, timeout=ainda processando)
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
- **Dashboard admin de reservas** (`/admin/reservas`) — cruza MS Reserva + Quarto + Cliente:
  quem reservou, quando, qual quarto, status, pagamento; stats (total/confirmadas/ocupados hoje);
  filtro + busca; modal de detalhes com dados do hóspede (nome, idade, gênero, CPF, telefone)

## O que FALTA implementar ❌

- [ ] MS Cliente retornando 502 no login após último redeploy — **investigar** (ver seção "Sessão 2026-06-18")
- [ ] Fotos reais na Home (hoje usa placeholder Unsplash; quarto já tem `fotos[]` na resposta da API)
- [ ] Links da navbar: Quartos, Reservas, Serviços, Contato (atualmente sem função)
- [ ] Persistir preferências da página Configurações (hoje só visuais)
- [ ] Editar dados de perfil de verdade (precisa endpoint no MS Cliente ligando `usuario`↔`cliente`)
- [x] ~~Proteção de `role` no backend~~ — FEITO em 2026-06-22 (auth JWT + role nos 4 MS; ver seção "Autenticação")
- [ ] Upload/exibição de fotos na Home (infra pronta no admin, falta usar na listagem pública)
- [ ] Overbooking: a checagem de sobreposição é `findFirst` (sem transação) — corrida de concorrência
      ainda permite, em teoria, duas reservas simultâneas no mesmo quarto/data (ver "Sessão 2026-06-22")
- [ ] Revalidar sobreposição também no `PUT /reservas/:id` (hoje só o `POST /criar` valida)

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
- `criar`/`atualizar` padronizam `cliente_cpf` (000.000.000-00) e `cliente_telefone` ((00) 00000-0000) a partir dos dígitos antes de salvar (ver "Sessão 2026-06-22").

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
- Valida cliente (axios) + status do quarto (axios, status 1 = Disponível) + **sobreposição de datas**
  (consulta `prisma.reserva` por reservas ativas [status 1 ou 2] do mesmo quarto que se sobreponham → 409). Ver "Sessão 2026-06-22".
- `reserva_status`: `1=Pendente, 2=Confirmada, 3=Cancelada, 4=Realocação`
- Consome `pagamento_queue` (eventos `PAGAMENTO_APROVADO`/`PAGAMENTO_RECUSADO`) → vira reserva para 2 ou 3.

### MS Pagamento (Express, 9534) — gateway `/pagamento`
- `POST /auth/login` (auth próprio) · `GET|POST /pagamentos`, `GET|PUT|PATCH|DELETE /pagamentos/:id`
- `POST /pagamentos` — `{ pagamento_tipo, pagamento_status, pagamento_data, pagamento_endereco }`
- `POST /cartoes` — `{ cartao_numero, cartao_validade, cartao_cvv, cartao_banco, cartao_nome, cartao_status }`
  ⚠ desde 2026-06-22 o cartão NÃO é guardado em texto puro: `cartao_numero` salva mascarado +
  hash (`**** **** **** 4444 #<hash>`) e `cartao_cvv` vira `***`. A validação aprova/recusa usa os
  dados enviados em `/pagamentos/processar`, não o cartão salvo.
- `POST /boletos` — `{ boleto_numero, boleto_vencimento, boleto_emissao, boleto_status }`
- `POST /depositos` — `{ deposito_banco, deposito_valor, deposito_agencia, deposito_conta, deposito_status }`
- `POST /tipo-pagamento` — `{ pagamento_id, reserva_id, tipo_pagamento_status, cartao_id? | boleto_id? | deposito_id? }`
  ⚠ `reserva_id` é **obrigatório** — campo NOT NULL no banco, adicionado ao schema em 2026-06-18
- `POST /pagamentos/processar` — `{ pagamento_id, reserva_id, metodo, dados? }` → 202 `{ aprovado, motivo, estimativa_ms }`
  (gateway simulado; após o timer publica PAGAMENTO_APROVADO/RECUSADO na fila `pagamento_queue`). Ver "Sessão 2026-06-22".
- Token próprio: `VITE_PAGAMENTO_TOKEN` no docker-compose do front (ou token hardcoded no pagamentoService.js).
  ⚠ Hoje o middleware `auth` (src/middlewares/auth.js) está **desligado** (passa direto) — token não é validado.

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

---

# Sessão 2026-06-22 — Fluxo por data, anti-overbooking e pagamento assíncrono

## Resumo
Três mudanças, commitadas e pushadas nos respectivos repos:
1. **Fluxo de reserva invertido** (front): escolher datas → ver só os quartos livres no período.
2. **Anti-overbooking** (MS Reserva): o servidor passou a validar sobreposição de datas.
3. **Pagamento assíncrono** (MS Pagamento + MS Reserva + front): gateway simulado que aprova/recusa
   e confirma a reserva via RabbitMQ, em vez de o front confirmar na hora.

## Commits desta sessão
- `frontHotelaria`: `feat: fluxo de reserva por data` + `feat: confirmacao de reserva assincrona via gateway de pagamento` + este update de contexto
- `PI_Hotel_Reserva`: `feat: validar sobreposicao de datas ao criar reserva (anti-overbooking)` + `fix: corrigir campo pagamento_status no consumer`
- `api_hotel_pagamento`: `feat: gateway de pagamento simulado assincrono via RabbitMQ`

## 1. Fluxo por data (front)
- `Home.jsx`: barra de busca com check-in/check-out; quartos só aparecem após datas válidas.
  - Disponibilidade real cruzando `GET /api/quartos` + `GET /reservas`; mostra só `status === 1`
    sem reserva ativa (status 1/2) sobreposta a `[checkin, checkout)`.
  - Filtro de status removido; filtro de tipo mantido.
- `ReservaModal.jsx`: aceita `datasIniciais` e pula a etapa de datas (abre direto no pagamento).
- **Backend é "cego" para datas por conta própria**: `PI_Hotel_Reserva/src/services/quarto.service.js`
  só checa `status === 1` (ignora as datas que recebe). A disponibilidade por data é calculada no front
  e validada no MS Reserva via Prisma (item 2). Criar reserva NÃO muda o `status` do quarto
  (confirmado no consumer do MS Quarto), então o `status` é só o estado manual do admin.

## 2. Anti-overbooking (MS Reserva)
- `reserva.controller.js > criar`: antes do `prisma.reserva.create`, faz `findFirst` por reserva ativa
  (status 1 ou 2) do mesmo `quarto_id` com `reserva_checkin < novoCheckout && reserva_checkout > novoCheckin`.
  Se achar → **409** "Já existe uma reserva para este quarto no período selecionado".
  Também valida checkout ≤ checkin → 400.
- ⚠ Limitações conhecidas: sem transação (corrida de concorrência ainda possível em teoria);
  o `PUT /reservas/:id` não revalida sobreposição.

## 3. Pagamento assíncrono (gateway simulado)
**Cadeia:** Front → `POST /pagamentos/processar` → (timer) → publica em `pagamento_queue` → MS Reserva consome → vira reserva.

- **MS Pagamento** (`pagamentoController.js`):
  - `avaliarPagamento(metodo, dados)` decide aprovar/recusar:
    - cartão: número = 16 dígitos, CVV = 3 dígitos e ≠ `000`, validade `AAAA-MM` não vencida e
      ano ≤ atual+20, número **não** terminado em `0`. Senão, recusa com motivo.
    - boleto e depósito: sempre compensam.
  - `processar`: responde **202** na hora com `{ aprovado, motivo, estimativa_ms }`, agenda `setTimeout`
    (cartão 5s, depósito 8s, boleto 12s) e ao fim atualiza `pagamento_status` e chama o producer.
  - `pagamentoProducer.js > publishResultadoPagamento`: `sendToQueue('pagamento_queue', { evento, reserva_id, ... })`
    com `evento` = `PAGAMENTO_APROVADO`/`PAGAMENTO_RECUSADO`. Usa fila direta (sem exchange/binding) → robusto.
- **MS Reserva** (`pagamento.consumer.js`): já existia consumindo `pagamento_queue`; só corrigi um bug
  (gravava `status_pagamento`, campo inexistente → agora `pagamento_status`). APROVADO → reserva 2; RECUSADO → reserva 3.
- **Front** (`ReservaModal.jsx`): removida a confirmação imediata; após criar tudo chama `processarPagamento`,
  vai pro step "confirmando" e faz polling do `GET /reservas/:id` (2=ok, 3=recusado com motivo, timeout ~40s=ainda processando).
  Campos do cartão relaxados (número até 19, CVV até 4) pra que valores inválidos cheguem ao backend.

### ⚠ Para funcionar em produção
- Os **3 serviços** precisam estar na versão nova ao mesmo tempo (front chama `/pagamentos/processar`,
  MS Pagamento publica, MS Reserva consome).
- Todos no **mesmo RabbitMQ** (`RABBITMQ_URL` consistente via Infisical).
- Após o redeploy do Jenkins, lembrar do **`iisreset`** (item 5 dos pontos de atenção).

## Sobre o erro 502 (explicação)
- **502 Bad Gateway** = o IIS/ARR (gateway) repassou a requisição ao container, mas **não recebeu uma
  resposta HTTP válida a tempo** (container caído, travado, ou demorando além do timeout do proxy).
  É diferente do 500 "URL Rewrite Module Error" (IP do container desatualizado no IIS após redeploy).
- No caso do **login do MS Cliente**: leva ~21s e devolve 502. O código está correto
  (`usuario.controller.js` lê `usuario_role`, gera JWT). O `prisma.js` cria `new PrismaClient()` sem
  config especial e o `login` faz `prisma.usuario.findUnique` logo no início. Os ~21s batem com
  **timeout de conexão ao MySQL** (o Prisma fica tentando conectar e o gateway desiste antes → 502).
  Causa provável: `DATABASE_URL` errada/inacessível no container novo, ou o MySQL recusando a conexão.
  **Investigar a conexão/env do banco — não mexer no código.** (ver "Sessão 2026-06-18", "O que verificar").
- ⚠ Update 2026-06-22: testado da casa do dev, o login respondeu em ~0,35s (404 p/ user inexistente),
  ou seja, **o 502 parece intermitente/resolvido**. O que estava travando o dev local era o
  `.env.local` apontando as `VITE_*_API` para `localhost` (Docker que nunca subiu) — **arquivo apagado**.
  O front sem `.env.local` usa os defaults de produção (`academico3...`) em `src/services/api.js`.

## Dashboard admin de reservas (adicionado 2026-06-22)
- `src/features/reserva/pages/ReservasAdmin.jsx` (rota `/admin/reservas`, AdminRoute) + `clienteService.js`.
- Cruza `GET /reservas` + `listarQuartos()` + `listarClientes()` (MS Cliente `GET /`) montando mapas
  `quarto_id→quarto` e `cliente_id→cliente`.
- Tabela: nº, cliente (nome), quarto (nº+tipo), check-in/out, período (andamento/futura/encerrada),
  status da reserva, pagamento (Aguardando/Pago/Recusado). Filtro por status + busca.
- Stats: total, confirmadas, **quartos ocupados hoje** (reservas ativas cobrindo a data atual).
- Clique na linha → modal com pagamento em destaque + dados do hóspede (nome, idade, gênero, CPF,
  telefone — todos vêm do `findMany` do MS Cliente) + resumo da estadia (noites, preço, total estimado).
- Link "Reservas" na nav admin (Quartos.jsx e TiposQuarto.jsx). Tudo só leitura — nenhum backend mudou.

## Repovoamento do banco (executado 2026-06-22)
Banco de produção limpo e repovoado via scripts (rodados contra o gateway `academico3`):
- **Limpou:** 14 reservas, 19 quartos, 2 fotos, 3 tipos antigos.
- **Criou:** 10 tipos (Standard, Casal, Solteiro, Luxo, Suíte, Suíte Master, Executivo, Família,
  Premium, Cobertura) + **48 quartos** (andares 101–412, preços ~R$170–1.548) + **48 fotos**
  (uma por quarto, ligada pelo `quarto_id`, imagem base64 em `foto_bin`).

### Scripts criados (usam só `fetch` nativo do Node 20, sem dependências)
- `pi_hotel_quarto/scripts/seed-quartos.js` — cria tipos+quartos+fotos. Idempotente (pula nº existentes).
  Config: `QUARTO_API` (default localhost:9533), `SEM_FOTOS=1`. Fotos baixadas do Unsplash → base64.
- `pi_hotel_quarto/scripts/reset-quartos.js` — apaga fotos+quartos (e tipos com `INCLUIR_TIPOS=1`).
  Destrutivo: dry-run por padrão, exige `CONFIRMA=SIM`. Apaga fotos antes do quarto (FK).
  ⚠ emite `QUARTO_REMOVIDO` → MS Reserva cancela reservas do quarto.
- `PI_Hotel_Reserva/scripts/reset-reservas.js` — apaga todas as reservas. Dry-run; exige `CONFIRMA=SIM`.
- ⚠ Ordem ao repovoar: reset-reservas → reset-quartos (INCLUIR_TIPOS=1) → seed-quartos.

### ⚠ Permissão de push
- `RuanCabralBandeira` NÃO tem write em `claracatarin4/pi_hotel_quarto` (push dá **403**). Os 3 commits
  dos scripts de quarto estão **só no local** até a `claracatarin4` adicionar o Ruan como colaborador.
  (Os repos `frontHotelaria` e `PI_Hotel_Reserva` aceitam push normalmente.)

### Front puxando a foto real
- `Home.jsx > fotoDoQuarto(quarto)`: usa `quarto.fotos[0].foto_bin` (base64) → `data:image/<ext>;base64,...`;
  só cai no placeholder Unsplash se o quarto não tiver foto. Aplicado no card e no modal.
- A foto vem no `GET /api/quartos` (getAll do MS Quarto inclui `fotos`). Atenção: 48 quartos com base64
  deixam essa resposta pesada (~poucos MB) — aceitável para o escopo, mas é o motivo de manter as imagens pequenas (w=600).

## Tratamento de dados — CPF/telefone e cartão (2026-06-22)

### CPF e telefone (cliente)
- **Front** `src/utils/validators.js`: `maskCPF`, `maskTelefone`, `validarCPF` (com dígitos
  verificadores), `validarTelefone`, `apenasDigitos`.
- `Cadastro.jsx`: máscara enquanto digita (CPF `000.000.000-00`, telefone `(00) 00000-0000`),
  valida CPF/telefone/idade (18–120) antes de enviar; manda o valor já padronizado.
- `ReservasAdmin.jsx`: formata CPF/telefone só na exibição (padroniza visualmente dados antigos).
- **Backend MS Cliente** `cliente.controller.js`: `formatarCPF`/`formatarTelefone` normalizam o
  formato no `criar` e `atualizar` (best-effort, não rejeita) — garante padrão mesmo via API direta.
- ⚠ A validação de CPF agora exige dígitos verificadores válidos: CPFs de teste antigos como
  `123.456.789-00` NÃO passam mais no cadastro novo (mas seguem sendo exibidos formatados).

### Cartão (segurança — MS Pagamento)
- Problema: `cartaoController` guardava `cartao_numero` e `cartao_cvv` em texto puro (o
  `sanitizeCartao` só escondia o CVV na resposta, não no banco).
- Correção (sem mudar schema): em `create/update/patch`,
  `cartao_numero` = `**** **** **** <4últimos> #<hash sha256 12 hex>` (cabe no VARCHAR45);
  `cartao_cvv` = `***` (nunca armazenado). Helper `mascararNumero` + `CVV_MASCARADO`.
- Não afeta a aprovação/recusa: ela usa os dados de `/pagamentos/processar`, não a tabela `cartao`.
- ⚠ Vale para cartões NOVOS após redeploy. Os 2 registros antigos com PAN em texto puro continuam
  no banco — falta um UPDATE para mascará-los (pendente, se quiserem).

## Autenticação e Autorização (implementado 2026-06-22, testar no Jenkins amanhã)
Resolve o que o professor apontou (não é "mascarar URL", é controle de acesso no backend).
**Pré-requisito atendido:** `JWT_SECRET="segredo"` agora é IGUAL nos 4 MS (o do Pagamento foi
alterado de `hotel_pagamento_secret` para `segredo`) → um token de login vale em todos.

### MS Cliente (`PI_hotel_cliente`, push ✅ — commit 67c41b7)
- Novo `src/middlewares/auth.js` (`auth` valida Bearer + injeta `req.user{id,login,role}`; `requireAdmin`).
- `GET /:id` e `PUT/PATCH /:id`: só dono (`usuario_id === req.user.id`) ou Admin → **corrige o IDOR `/cliente/1`**.
- `GET /`: Admin vê todos; cliente comum só o próprio (filtra por `usuario_id`).
- `PATCH /:id/excluir`: só Admin. `POST /` (cadastro) e login/cadastrar continuam PÚBLICOS.

### MS Reserva (`PI_Hotel_Reserva`, push ✅ — commit 54f8ef0)
- Aplica o `middlewares/auth.js` (que já existia) em todas as rotas. Adiciona `jsonwebtoken` ao package.json.

### MS Pagamento (`api_hotel_pagamento`, push ✅ — commit d0f5e90)
- Religa o `middlewares/auth.js` (estava com `return next()`). Todas as rotas já usavam `auth`.

### MS Quarto (`pi_hotel_quarto`, push ❌ 403 — commit LOCAL 76c0ab4)
- Novo `middlewares/auth.js`. GET (catálogo) público; POST/PUT/PATCH/DELETE de quartos/tipos/fotos = só Admin.
- Reordena `/api/quartos/reservas` antes de `/:id`. Scripts seed/reset aceitam `TOKEN=...`.
- ⚠ NÃO foi pushado (sem acesso de escrita). Precisa a `claracatarin4` aplicar/dar acesso.

### Front (`frontHotelaria`, push ✅ — commit d4f853c)
- `api.js`: response interceptor — 401 (sessão inválida) limpa e redireciona pro `/login`
  (exceto endpoints de login/cadastro); 403 é repassado ao componente. Request interceptor já existia.
- `pagamentoService.js`: removido o token fixo; usa o token do usuário logado (via interceptor).

### ⚠ CHECKLIST PRA TESTAR NO JENKINS (importante)
1. **A conta Admin precisa ter `usuario_role = 'Admin'` no banco** — senão `requireAdmin` bloqueia (403)
   o painel de quartos. Conferir/ajustar na tabela `usuario` do MS Cliente.
2. **Redeploy + `iisreset`** em cada serviço alterado (o secret novo do Pagamento só vale após reiniciar).
3. **MS Quarto** não está deployado com auth (push 403) — até aplicar, escrita de quarto segue aberta.
4. Rodar `seed`/`reset` de quarto após o auth exige `TOKEN=<jwt admin>` (senão 401/403).
5. Os `.env` de Reserva/Quarto/Pagamento em Downloads tinham a senha do banco com `@` não-escapado
   (`senac@12938`); o do Cliente estava certo (`senac%4012938`). Como os serviços funcionam, o env real
   (Infisical) deve estar correto — mas conferir se algum der erro de conexão.

---

# AMANHÃ NA FACULDADE — commit/push e deploy

## Status de push por repositório (em 2026-06-22)
| Repo | Commits da sessão | Push |
|---|---|---|
| frontHotelaria | foto real, fallback img, CPF/telefone, response interceptor 401/403, pagamento token, este docs | ✅ pushado |
| PI_hotel_cliente | usuario_role/JWT, normalização CPF/telefone, **auth+dono/admin** (`67c41b7`) | ✅ pushado |
| PI_Hotel_Reserva | overbooking, fix consumer, reset-reservas, **auth nas rotas** (`54f8ef0`) | ✅ pushado |
| api_hotel_pagamento | gateway assíncrono, máscara/hash cartão, **religar auth** (`d0f5e90`) | ✅ pushado |
| **pi_hotel_quarto** | seed/reset, controller fotos, **auth (admin nas escritas)**, CONTEXTO.md | ✅ pushado (`6fa7e37`) |

> ✅ **Todos os 5 repos estão pushados no GitHub** (o Ruan virou colaborador de todos). Não há mais nada
> pendente de commit/push — amanhã é só **deploy + teste**.

## O que falta fazer amanhã (só deploy/teste)
1. **Confirmar `JWT_SECRET=segredo`** nos 4 serviços (Infisical) — Pagamento foi alterado, precisa redeploy.
2. **A conta Admin precisa ter `usuario_role='Admin'`** no banco (tabela `usuario`), senão admin de quarto dá 403.
3. **Build no Jenkins** dos serviços (front + 4 MS) + **`iisreset`** depois de cada redeploy.
4. Testar: login Admin → criar/editar quarto (ok); cliente comum chamar `/cliente/1` de outro → 403;
   reserva → pagamento aprovado/recusado; `/admin/quartos` por não-admin → bloqueado.

## Cópia recuperável das mudanças do MS Quarto (caso o local se perca)
**Novo `src/middlewares/auth.js`** (idêntico ao do MS Cliente):
```js
const jwt = require('jsonwebtoken');
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.send(401, { erro: 'Token não fornecido.' }); return next(false); }
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') { res.send(401, { erro: 'Token com formato inválido.' }); return next(false); }
  jwt.verify(parts[1], process.env.JWT_SECRET, (err, decoded) => {
    if (err) { res.send(401, { erro: 'Token inválido ou expirado.' }); return next(false); }
    req.user = decoded; return next();
  });
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'Admin') { res.send(403, { erro: 'Acesso negado: requer perfil Admin.' }); return next(false); }
  return next();
}
module.exports = { auth, requireAdmin };
```
**Rotas** (`quarto.routes.js`, `tipoQuarto.routes.js`, `foto.routes.js`): no topo
`const { auth, requireAdmin } = require('../middlewares/auth');`; manter os `GET` públicos e
colocar `auth, requireAdmin` antes do controller em todo `POST/PUT/PATCH/DELETE`. Em
`quarto.routes.js`, registrar `/api/quartos/reservas` ANTES de `/api/quartos/:id`.
`jsonwebtoken` já está no package.json do Quarto.
