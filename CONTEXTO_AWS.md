# Guia Completo de Deploy na AWS — Projeto Hotel Hotelaria

> **Para quem é este guia?**
> Este guia foi escrito para um aluno que nunca fez deploy na AWS. Cada passo está explicado com exatamente o que clicar, o que digitar e o que esperar ver na tela. Siga a ordem sem pular etapas.

---

## ESTADO ATUAL DO DEPLOY — 2026-07-01

### Recursos criados com sucesso

| Recurso | Nome / Valor | Status |
|---------|-------------|--------|
| EC2 RabbitMQ | `hotel-rabbitmq` — IP privado `172.31.11.117` | ✅ Running |
| EC2 Builder | `hotel-builder` — usado para todos os comandos | ✅ Running |
| ECR repos | hotel-front, hotel-cliente, hotel-reserva, hotel-quarto, hotel-pagamento | ✅ Criados |
| Task Definitions | hotel-front:2, hotel-cliente:2, hotel-reserva:2, hotel-quarto:1, hotel-pagamento:2 | ✅ Registradas |
| ALB | `hotelLB-1616094860.us-east-1.elb.amazonaws.com` | ✅ Ativo |
| Target Groups (IP) | `front-tg-one`, `front-tg-two` | ✅ Criados |
| Listeners | Porta 80 → front-tg-one, Porta 8080 → front-tg-two | ✅ Criados |
| ECS Cluster | `hotel-cluster` | ✅ Criado |
| ECS Service | `front-service` (CODE_DEPLOY, task-def hotel-front:2) | ✅ Criado |
| VPC | `vpc-0a83ca351b326f588` | ✅ |
| Security Group | `sg-0cc738079c4737459` (hotel-sg) | ✅ |
| Subnets usadas | `subnet-08cc713626c40b8af`, `subnet-0fa81ef3df9ac2cd3` | ✅ |

### Pendente — próximos passos obrigatórios

| O que falta | Motivo do problema |
|-------------|-------------------|
| ❌ TGs: `cliente-tg`, `reserva-tg`, `quarto-tg`, `pagamento-tg` | `--matcher HttpCode=200,405` falhou — CLI interpretou vírgula como lista. Fix: usar `--matcher '{"HttpCode":"200,405"}'` |
| ❌ Listeners: portas 9531, 9532, 9533, 9534 | TGs acima não existiam na hora da criação |
| ❌ ECS Services: `cliente-service`, `reserva-service`, `quarto-service`, `pagamento-service` | ARNs dos TGs estavam vazios nos JSONs |
| ❌ Docker images | Imagens ainda não buildadas e enviadas ao ECR — os serviços não conseguem iniciar sem elas |
| ❌ CodeDeploy + CodePipeline | Fases 8, 9, 10 não executadas |

### Correção imediata necessária (rodar na EC2 hotel-builder)

```bash
cd ~/hotel/hotel-deploy

ALB_ARN=$(aws elbv2 describe-load-balancers --names hotelLB \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text --no-cli-pager)
VPC_ID="vpc-0a83ca351b326f588"

# Cria os 4 TGs que faltaram (formato correto para HttpCode múltiplo)
CLIENTE=$(aws elbv2 create-target-group --no-cli-pager \
  --name cliente-tg --protocol HTTP --port 9531 --vpc-id $VPC_ID \
  --target-type ip --health-check-path /usuario/login \
  --matcher '{"HttpCode":"200,405"}' \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

RESERVA=$(aws elbv2 create-target-group --no-cli-pager \
  --name reserva-tg --protocol HTTP --port 9532 --vpc-id $VPC_ID \
  --target-type ip --health-check-path /reservas \
  --matcher '{"HttpCode":"200,401"}' \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

QUARTO=$(aws elbv2 create-target-group --no-cli-pager \
  --name quarto-tg --protocol HTTP --port 9533 --vpc-id $VPC_ID \
  --target-type ip --health-check-path /api/quartos \
  --matcher '{"HttpCode":"200,401"}' \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

PAGAMENTO=$(aws elbv2 create-target-group --no-cli-pager \
  --name pagamento-tg --protocol HTTP --port 9534 --vpc-id $VPC_ID \
  --target-type ip --health-check-path /pagamentos \
  --matcher '{"HttpCode":"200,401,403"}' \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

echo "cliente-tg:   $CLIENTE"
echo "reserva-tg:   $RESERVA"
echo "quarto-tg:    $QUARTO"
echo "pagamento-tg: $PAGAMENTO"

# Cria os 4 listeners que faltaram
aws elbv2 create-listener --no-cli-pager \
  --load-balancer-arn $ALB_ARN --protocol HTTP --port 9531 \
  --default-actions Type=forward,TargetGroupArn=$CLIENTE > /dev/null && echo "Listener 9531 OK"

aws elbv2 create-listener --no-cli-pager \
  --load-balancer-arn $ALB_ARN --protocol HTTP --port 9532 \
  --default-actions Type=forward,TargetGroupArn=$RESERVA > /dev/null && echo "Listener 9532 OK"

aws elbv2 create-listener --no-cli-pager \
  --load-balancer-arn $ALB_ARN --protocol HTTP --port 9533 \
  --default-actions Type=forward,TargetGroupArn=$QUARTO > /dev/null && echo "Listener 9533 OK"

aws elbv2 create-listener --no-cli-pager \
  --load-balancer-arn $ALB_ARN --protocol HTTP --port 9534 \
  --default-actions Type=forward,TargetGroupArn=$PAGAMENTO > /dev/null && echo "Listener 9534 OK"

# Atualiza os ARNs nos JSONs de criação de serviço
sed -i "s|\"targetGroupArn\": \"arn[^\"]*cliente-tg[^\"]*\"|\"targetGroupArn\": \"$CLIENTE\"|g" create-cliente-service.json
sed -i "s|\"targetGroupArn\": \"arn[^\"]*reserva-tg[^\"]*\"|\"targetGroupArn\": \"$RESERVA\"|g" create-reserva-service.json
sed -i "s|\"targetGroupArn\": \"arn[^\"]*quarto-tg[^\"]*\"|\"targetGroupArn\": \"$QUARTO\"|g" create-quarto-service.json
sed -i "s|\"targetGroupArn\": \"arn[^\"]*pagamento-tg[^\"]*\"|\"targetGroupArn\": \"$PAGAMENTO\"|g" create-pagamento-service.json

# Confirma que os ARNs foram substituídos
grep "targetGroupArn" create-cliente-service.json

# Cria os 4 serviços ECS que faltaram
aws ecs create-service --no-cli-pager --cli-input-json file://create-cliente-service.json
aws ecs create-service --no-cli-pager --cli-input-json file://create-reserva-service.json
aws ecs create-service --no-cli-pager --cli-input-json file://create-quarto-service.json
aws ecs create-service --no-cli-pager --cli-input-json file://create-pagamento-service.json

# Verifica os 5 serviços
aws ecs list-services --no-cli-pager --cluster hotel-cluster --output table
```

### Depois de corrigir — próximo passo obrigatório

As imagens Docker ainda não foram buildadas. Os serviços vão ficar em `PENDING` até as builds serem feitas:

```bash
# Volta para a Fase 3 — build e push das imagens
cd ~/hotel

ACCOUNT_ID="508383244883"
REGION="us-east-1"

aws ecr get-login-password --region $REGION | \
  docker login --username AWS \
  --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build e push de cada serviço (rodar um por vez)
cd ~/hotel/frontHotelaria && docker build -t hotel-front . && \
  docker tag hotel-front:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/hotel-front:latest && \
  docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/hotel-front:latest

cd ~/hotel/PI_hotel_cliente && docker build -t hotel-cliente . && \
  docker tag hotel-cliente:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/hotel-cliente:latest && \
  docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/hotel-cliente:latest

cd ~/hotel/PI_Hotel_Reserva && docker build -t hotel-reserva . && \
  docker tag hotel-reserva:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/hotel-reserva:latest && \
  docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/hotel-reserva:latest

cd ~/hotel/pi_hotel_quarto && docker build -t hotel-quarto . && \
  docker tag hotel-quarto:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/hotel-quarto:latest && \
  docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/hotel-quarto:latest

cd ~/hotel/api_hotel_pagamento && docker build -t hotel-pagamento . && \
  docker tag hotel-pagamento:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/hotel-pagamento:latest && \
  docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/hotel-pagamento:latest
```

> **Nota importante:** Os task definitions usam a tag `IMAGE1_NAME` como placeholder (para ser substituída pelo CodePipeline). Para testar antes de configurar o CodePipeline, é necessário registrar novas revisões dos task definitions com a tag `:latest`. Isso é feito automaticamente quando o CodePipeline rodar pela primeira vez (Fases 9 e 10).

---

---

## Repositórios AWS (código já adaptado)

Todos os repos abaixo estão em `RuanCabralBandeira` com as mudanças AWS já aplicadas:

| Serviço | Repositório AWS |
|---------|----------------|
| Front-end | https://github.com/RuanCabralBandeira/frontHotelaria_AWS |
| MS Cliente | https://github.com/RuanCabralBandeira/PI_hotel_cliente_AWS |
| MS Reserva | https://github.com/RuanCabralBandeira/PI_Hotel_Reserva_AWS |
| MS Quarto | https://github.com/RuanCabralBandeira/pi_hotel_quarto_AWS |
| MS Pagamento | https://github.com/RuanCabralBandeira/api_hotel_pagamento_AWS |

**Mudanças aplicadas vs repos originais (Jenkins não foi afetado):**

| Arquivo | Mudança |
|---------|---------|
| `frontHotelaria/vite.config.js` | `base: '/20261prj5/hotel/'` → `base: '/'` |
| `frontHotelaria/src/routes/AppRoutes.jsx` | `basename="/20261prj5/hotel"` → `basename="/"` |
| `frontHotelaria/src/services/api.js` | Removidos fallbacks SENAC; redirect 401 corrigido para `/login` |
| `PI_Hotel_Reserva/Dockerfile` | CMD agora roda `prisma db push` antes de iniciar o servidor |
| `pi_hotel_quarto/Dockerfile` | Substituído `npm run dev` (nodemon) por `node src/server.js`; adicionado `prisma db push` |

## Ambiente de trabalho — como executar os comandos deste guia

> **Cloud9 não é necessário.** Use uma das opções abaixo. A EC2 de builds (Fase 0.5) é a opção recomendada — ela resolve tudo incluindo Docker.

### Opção A — EC2 de builds (recomendada)

Criamos uma EC2 separada para rodar todos os comandos. Ela fica no ar só durante o deploy. Veja a **Fase 0.5** logo abaixo.

### Opção B — AWS CloudShell (sem Docker)

O CloudShell é um terminal no próprio console AWS — sem instalação, sem configuração.

1. No console AWS, clica no ícone de terminal `>_` no canto superior direito
2. Uma janela de terminal abre direto no browser
3. AWS CLI já está instalado e autenticado

**Limitação:** o CloudShell **não tem Docker**. Use para criar ECR repos, registrar task definitions, criar ECS services, ALB, etc. Para o `docker build` e `docker push`, use a EC2 da Fase 0.5 ou a máquina local.

### Opção C — Máquina local

Se você tiver Docker Desktop e AWS CLI instalados no seu computador:

```bash
# Configura as credenciais do lab (pega em AWS Details → Show)
aws configure
# AWS Access Key ID: (cole aqui)
# AWS Secret Access Key: (cole aqui)
# Default region name: us-east-1
# Default output format: json
```

> Credenciais do lab expiram a cada sessão — precisa reconfigurar quando o lab reiniciar.

---

## FASE 0.5 — EC2 de Builds (substituto do Cloud9)

> Crie esta EC2 **antes de qualquer outra fase**. Ela serve como ambiente de trabalho para todos os comandos: git clone, docker build, docker push, aws cli.

### Criar a EC2 de builds

1. Console AWS → **EC2 → Instances → Launch instances**
2. Preenche:

```
Name: hotel-builder
AMI: Amazon Linux 2023 AMI
Instance type: t3.micro
Key pair: vockey
```

**Network settings:**
```
VPC: LabVPC
Subnet: Public Subnet 1
Auto-assign public IP: Enable
Security group: Create new → nome: builder-sg
Inbound: SSH porta 22, source 0.0.0.0/0
```

Clica em **Launch instance**.

### Conectar pela EC2 Instance Connect (sem SSH, direto no browser)

1. Console EC2 → seleciona a instância `hotel-builder`
2. Clica em **Connect** (botão laranja)
3. Escolhe a aba **EC2 Instance Connect**
4. Clica em **Connect**

Uma janela de terminal abre no browser — sem precisar de cliente SSH, sem configurar chave.

### Preparar o ambiente

Cole esses comandos no terminal que abriu:

```bash
# Instala Docker
sudo dnf install -y docker git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Fecha e reabre a conexão Instance Connect para aplicar o grupo docker
# (ou use sudo antes de cada docker command)

# Verifica
docker --version
aws --version   # já vem instalado na Amazon Linux 2023
```

### Autenticar o Docker no ECR e clonar os repos

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"

# Login no ECR
aws ecr get-login-password --region $REGION | \
  docker login --username AWS \
  --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Clonar os repos AWS
mkdir -p ~/hotel && cd ~/hotel

git clone https://github.com/RuanCabralBandeira/frontHotelaria_AWS.git        frontHotelaria
git clone https://github.com/RuanCabralBandeira/PI_hotel_cliente_AWS.git      PI_hotel_cliente
git clone https://github.com/RuanCabralBandeira/PI_Hotel_Reserva_AWS.git      PI_Hotel_Reserva
git clone https://github.com/RuanCabralBandeira/pi_hotel_quarto_AWS.git       pi_hotel_quarto
git clone https://github.com/RuanCabralBandeira/api_hotel_pagamento_AWS.git   api_hotel_pagamento

mkdir -p ~/hotel/hotel-deploy
```

> A partir daqui, todos os comandos deste guia são executados nessa EC2. Substitui `~/hotel` por `~/hotel` nos comandos das próximas fases.

---

## FASE 0 — Entender o Infisical e Extrair os Segredos

> **Leia esta fase antes de qualquer coisa.** O projeto usa Infisical para guardar todos os segredos (senhas, URLs, chaves). Sem entender isso, você não vai conseguir preencher as configurações da AWS.

### O que é o Infisical?

Infisical é um cofre de segredos — funciona como um `.env` que fica na nuvem, protegido. Em vez de colocar senhas e chaves direto no código, o projeto guarda tudo no Infisical.

### Como o projeto usa o Infisical hoje (no SENAC / Jenkins)

No Jenkins, cada MS tem uma etapa chamada `Fetch Secrets` que faz exatamente isso:

```bash
npx -y @infisical/cli export --env="dev" --path="/cliente" --token="st.xxx..." > .env
```

Esse comando:
1. Conecta no Infisical com o token
2. Baixa todos os segredos daquele MS (path `/cliente`, `/reserva`, etc.)
3. Salva num arquivo `.env`
4. O Docker Compose lê esse `.env` e injeta as variáveis no container

### Por que isso é um problema na AWS?

Na AWS **não existe Jenkins** rodando antes do container. O ECS simplesmente sobe a imagem Docker — sem gerar o `.env` antes. Resultado: o container inicia **sem nenhuma variável de ambiente** e falha.

**Solução:** Em vez do Infisical, vamos injetar as variáveis diretamente no ECS Task Definition. O resultado final é o mesmo (o container recebe as variáveis), só o meio é diferente.

### 0.1 — Extrair os segredos reais do Infisical

Os tokens já estão nos Jenkinsfiles de cada MS. Vamos usá-los para ver os valores reais.

**Na EC2 de builds (ou CloudShell), execute um comando por MS:**

```bash
# MS Cliente — exibe todos os segredos do path /cliente
npx -y @infisical/cli export \
  --env="dev" \
  --path="/cliente" \
  --token="st.80ebaa64-d2fe-4a2a-80d7-0d1422b6dad0.1e473ced7b20933a3ce59558545b5c27.5c170c6320dd763f29a1d2d5fffd94ad"
```

```bash
# MS Reserva — exibe todos os segredos do path /reserva
npx -y @infisical/cli export \
  --env="dev" \
  --path="/reserva" \
  --token="st.4b539ca4-50f7-4edb-a932-86047d6ab1a2.0caa1140598679790043d46a09e07e89.92b4a8d2d98d6a1e9247a0fb0aff39e6"
```

```bash
# MS Quarto — exibe todos os segredos do path /quarto
npx -y @infisical/cli export \
  --env="dev" \
  --path="/quarto" \
  --token="st.0f20435c-cc8b-4f06-8409-66d5cf392ad3.161752b8e21c58feeeba8cb68067cd37.a9504cd622815cea2d12e004cbf37e42"
```

```bash
# MS Pagamento — exibe todos os segredos do path /pagamento
npx -y @infisical/cli export \
  --env="dev" \
  --path="/pagamento" \
  --token="st.9f5c370d-4cd4-40df-bf3a-84cbfefb99e0.f62a8b34cbc3a65e086f6a9f63f5bf95.05eab83d22dfe8e0fed54f8df122f4c3"
```

O output vai ser algo assim:
```
DATABASE_URL="mysql://usuario:senha@host:3306/banco"
JWT_SECRET="alguma_chave_longa_aqui"
RABBITMQ_URL="amqp://usuario:senha@host:5672"
PORT="9531"
```

### 0.2 — Valores reais de todos os .env do projeto

Os valores abaixo foram extraídos dos .env completos de cada MS. Todos usam o mesmo `JWT_SECRET="segredo"` — consistente.

> O RabbitMQ do SENAC usa IP interno `10.136.38.50` que não é acessível da AWS. Na AWS vamos usar o IP privado da EC2 que criaremos na Fase 1, com as **mesmas credenciais**: `admin / admin`.

**Variáveis do Infisical que PERMANECEM IGUAIS na AWS:**

| Variável | Valor (igual em todos os MS) |
|----------|------------------------------|
| `JWT_SECRET` | `segredo` |

**Credenciais do RabbitMQ** (mesmas — só o host muda):

| Ambiente | RABBITMQ_URL |
|----------|-------------|
| SENAC | `amqp://admin:admin@10.136.38.50:5672` |
| AWS | `amqp://admin:admin@<EC2_PRIVATE_IP>:5672` |

### 0.3 — .env original de cada MS (para referência)

**MS Cliente (dev5.env):**
```
DATABASE_URL=mysql://20261_projint5_manha:senac%4012938@edumysql.acesso.rj.senac.br:3306/20261_projint5_manha_hotel_cliente
JWT_SECRET=segredo
PORT=9531
RABBITMQ_URL=amqp://admin:admin@10.136.38.50:5672
URL_SERVICO_PAGAMENTO=http://academico3.rj.senac.br/20261prj5/hotel/pagamento
URL_SERVICO_QUARTO=http://academico3.rj.senac.br/20261prj5/hotel/api/quarto
URL_SERVICO_RESERVA=http://academico3.rj.senac.br/20261prj5/hotel/reserva/reservas
```

**MS Reserva (dev9.env):**
```
CLIENTE_API_URL=http://academico3.rj.senac.br/20261prj5/hotel/cliente/
DATABASE_URL=mysql://20261_projint5_manha:senac@12938@edumysql.acesso.rj.senac.br:3306/20261_projint5_manha_hotel_reserva
JWT_SECRET=segredo
PORT=9532
QUARTO_API_URL=http://academico3.rj.senac.br/20261prj5/hotel/quarto/api/quartos
RABBITMQ_URL=amqp://admin:admin@10.136.38.50:5672
```

**MS Quarto (dev6.env):**
```
DATABASE_URL=mysql://20261_projint5_manha:senac@12938@edumysql.acesso.rj.senac.br:3306/20261_projint5_manha_hotel_quarto
JWT_SECRET=segredo
PORT=9533
RABBITMQ_URL=amqp://admin:admin@10.136.38.50:5672
URL_SERVICO_CLIENTE=http://academico3.rj.senac.br/20261prj5/cliente/reserva   ← TYPO no SENAC (corrigido na AWS)
URL_SERVICO_PAGAMENTO=http://academico3.rj.senac.br/20261prj5/hotel/pagamento
URL_SERVICO_RESERVA=http://academico3.rj.senac.br/20261prj5/hotel/reserva/reservas
```

**MS Pagamento (dev8.env):**
```
DATABASE_URL=mysql://20261_projint5_manha:senac@12938@edumysql.acesso.rj.senac.br:3306/20261_projint5_manha_hotel_pagamento
JWT_SECRET=segredo
PORT=9534
RABBITMQ_URL=amqp://admin:admin@10.136.38.50:5672
URL_SERVICO_CLIENTE=http://academico3.rj.senac.br/20261prj5/hotel/cliente
URL_SERVICO_QUARTO=http://academico3.rj.senac.br/20261prj5/hotel/quarto
URL_SERVICO_RESERVA=http://academico3.rj.senac.br/20261prj5/hotel/reserva
```

**Front-end (dev7.env):**
```
VITE_PAGAMENTO_API=http://academico3.rj.senac.br/20261prj5/hotel/pagamento
VITE_QUARTO_API=http://academico3.rj.senac.br/20261prj5/hotel/quarto
VITE_RESERVA_API=http://academico3.rj.senac.br/20261prj5/hotel/reserva
VITE_USUARIO_API=http://academico3.rj.senac.br/20261prj5/hotel/cliente
```

### 0.4 — Mapa completo de variáveis por MS (valores AWS prontos para copiar)

> Substitui `<RDS_ENDPOINT>`, `<EC2_PRIVATE_IP>` e `<ALB_DNS>` pelos valores reais ao chegar nas respectivas fases.

**MS Cliente — ECS task definition:**
```
DATABASE_URL          = mysql://20261_projint5_manha:senac%4012938@edumysql.acesso.rj.senac.br:3306/20261_projint5_manha_hotel_cliente
JWT_SECRET            = segredo
PORT                  = 9531
RABBITMQ_URL          = amqp://admin:admin@<EC2_PRIVATE_IP>:5672
URL_SERVICO_PAGAMENTO = http://<ALB_DNS>:9534
URL_SERVICO_QUARTO    = http://<ALB_DNS>:9533/api/quarto
URL_SERVICO_RESERVA   = http://<ALB_DNS>:9532/reservas
```

**MS Reserva — ECS task definition:**
```
CLIENTE_API_URL = http://<ALB_DNS>:9531
DATABASE_URL    = mysql://20261_projint5_manha:senac%4012938@edumysql.acesso.rj.senac.br:3306/20261_projint5_manha_hotel_reserva
JWT_SECRET      = segredo
PORT            = 9532
QUARTO_API_URL  = http://<ALB_DNS>:9533/api/quartos
RABBITMQ_URL    = amqp://admin:admin@<EC2_PRIVATE_IP>:5672
```

**MS Quarto — ECS task definition:**
```
DATABASE_URL          = mysql://20261_projint5_manha:senac%4012938@edumysql.acesso.rj.senac.br:3306/20261_projint5_manha_hotel_quarto
JWT_SECRET            = segredo
PORT                  = 9533
RABBITMQ_URL          = amqp://admin:admin@<EC2_PRIVATE_IP>:5672
URL_SERVICO_CLIENTE   = http://<ALB_DNS>:9531
URL_SERVICO_PAGAMENTO = http://<ALB_DNS>:9534
URL_SERVICO_RESERVA   = http://<ALB_DNS>:9532/reservas
```

**MS Pagamento — ECS task definition:**
```
DATABASE_URL          = mysql://20261_projint5_manha:senac%4012938@edumysql.acesso.rj.senac.br:3306/20261_projint5_manha_hotel_pagamento
JWT_SECRET            = segredo
PORT                  = 9534
RABBITMQ_URL          = amqp://admin:admin@<EC2_PRIVATE_IP>:5672
URL_SERVICO_CLIENTE   = http://<ALB_DNS>:9531
URL_SERVICO_QUARTO    = http://<ALB_DNS>:9533
URL_SERVICO_RESERVA   = http://<ALB_DNS>:9532
```

**Front-end — ECS task definition:**
```
PORT               = 9540
VITE_PAGAMENTO_API = http://<ALB_DNS>:9534
VITE_QUARTO_API    = http://<ALB_DNS>:9533
VITE_RESERVA_API   = http://<ALB_DNS>:9532
VITE_USUARIO_API   = http://<ALB_DNS>:9531
```

> **Nota sobre `DATABASE_URL`:** O `%40` é o símbolo `@` codificado para URL — a senha real é `senac@12938`. O Prisma exige essa codificação para não confundir `@` da senha com o `@` que separa usuário/senha do host. Os .env originais de MS Reserva, Quarto e Pagamento tinham `senac@12938` sem codificação, o que funcionava no Jenkins por acaso. Na AWS, usamos `senac%4012938` igual ao MS Cliente para garantir.

---

## O que vamos subir na AWS

O projeto tem 5 serviços que precisam rodar em paralelo:

| Serviço | Pasta do repositório | Porta |
|---------|---------------------|-------|
| Front-end (React) | `frontHotelaria` | 9540 |
| MS Cliente | `PI_hotel_cliente` | 9531 |
| MS Reserva | `PI_Hotel_Reserva` | 9532 |
| MS Quarto | `pi_hotel_quarto` | 9533 |
| MS Pagamento | `api_hotel_pagamento` | 9534 |

Além disso, vamos criar na AWS:
- **1 EC2** rodando RabbitMQ (comunicação entre os MS)
- **1 ALB** (balanceador de carga) que recebe o tráfego e distribui para cada serviço
- **5 repositórios ECR** (onde ficam as imagens Docker)
- **1 cluster ECS Fargate** com 5 serviços rodando os containers
- **5 pipelines CodePipeline** (CI/CD automático)

> **Banco de dados:** O MySQL do SENAC (`edumysql.acesso.rj.senac.br`) é acessível de qualquer rede — vamos usá-lo diretamente. Não precisa criar RDS na AWS.

---

## Arquitetura Final

```
Internet
    │
    ▼
ALB hotelLB (DNS público: hotelLB-xxxx.us-east-1.elb.amazonaws.com)
    │
    ├── Porta  80  ──► front-tg-one  ──► ECS: front-service   (porta 9540)
    ├── Porta 8080  ──► front-tg-two  ──► ECS: front-service   (blue/green)
    ├── Porta 9531  ──► cliente-tg    ──► ECS: cliente-service (porta 9531)
    ├── Porta 9532  ──► reserva-tg    ──► ECS: reserva-service (porta 9532)
    ├── Porta 9533  ──► quarto-tg     ──► ECS: quarto-service  (porta 9533)
    └── Porta 9534  ──► pagamento-tg  ──► ECS: pagamento-svc   (porta 9534)

Infraestrutura interna (VPC):
    └── EC2 hotel-rabbitmq  (IP privado: 10.0.X.X, porta 5672)

Banco de dados (externo — SENAC, acessível de qualquer rede):
    └── edumysql.acesso.rj.senac.br:3306  (mesmo banco usado no Jenkins/SENAC)
```

---

## ORDEM DE CRIAÇÃO (não pule etapas)

```
1. EC2 com RabbitMQ        ← precisa do IP privado antes de criar task definitions
2. ECR + imagens Docker    ← build e push dos 5 containers
3. Task Definitions        ← usa IP do RabbitMQ; DATABASE_URL já vem do SENAC
4. Target Groups (6)       ← prepara os destinos do tráfego
5. Security Group + ALB    ← cria o balanceador com os 6 listeners
6. Substituir ALB_DNS      ← coloca o DNS do ALB nos task definitions
7. Registrar task defs     ← registra os 5 no ECS
8. ECS Services (5)        ← sobe os containers
9. CodeDeploy              ← configura deploy blue/green do front
10. CodePipeline (5)       ← CI/CD automático
11. Validação              ← testa tudo
```

---

## FASE 1 — EC2 com RabbitMQ

> **Por que primeiro?** Precisamos do IP privado da EC2 para colocar nos arquivos de configuração dos MS. Se criar depois, terá que reeditar vários arquivos.

### 1.1 Criar a EC2

1. No console AWS, clica em **EC2** no menu de serviços
2. No menu lateral esquerdo, clica em **Instances**
3. Clica no botão laranja **Launch instances**
4. Preenche os campos:

**Name and tags:**
```
Name: hotel-rabbitmq
```

**Application and OS Images:**
- Seleciona **Amazon Linux** (deve vir selecionado por padrão)
- Deixa a versão **Amazon Linux 2023 AMI**

**Instance type:**
```
t3.micro
```

**Key pair:**
- Seleciona **vockey** (já existe no lab — NÃO cria um novo)

**Network settings** — clica em **Edit** e preenche:
```
VPC: LabVPC
Subnet: Public Subnet 1
Auto-assign public IP: Enable
```

Em **Firewall (security groups)**, seleciona **Create security group** e preenche:
```
Security group name: rabbitmq-sg
Description: RabbitMQ para o projeto hotel
```

Clica em **Add security group rule** e adiciona as regras abaixo (além da regra SSH que já vem):

| Type | Port | Source | Description |
|------|------|--------|-------------|
| SSH | 22 | 0.0.0.0/0 | Acesso SSH |
| Custom TCP | 5672 | 0.0.0.0/0 | AMQP (RabbitMQ) |
| Custom TCP | 15672 | 0.0.0.0/0 | Painel web RabbitMQ |

**Configure storage:**
- Deixa o padrão (8 GB gp3)

**Advanced details** — rola até o final da página até achar o campo **User data**:

> **O que é User data?** São comandos que a EC2 executa automaticamente na primeira vez que liga. Vamos usar para instalar o Docker e subir o RabbitMQ sem precisar entrar na máquina.

Cola exatamente o texto abaixo no campo User data:

```bash
#!/bin/bash
dnf update -y
dnf install -y docker
systemctl start docker
systemctl enable docker
docker run -d \
  --name rabbitmq \
  --restart always \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin \
  rabbitmq:3-management
```

Clica em **Launch instance** (botão laranja no canto inferior direito).

### 1.2 Aguardar a EC2 iniciar

1. Clica em **View all instances**
2. Aguarda o campo **Instance state** mudar de `Pending` para `Running` (leva ~1 minuto)
3. Clica na instância `hotel-rabbitmq` para ver os detalhes

### 1.3 Anotar os IPs

Na aba **Details**, anota os dois valores:

```
Public IPv4:  XX.XX.XX.XX    ← para acessar o painel web pelo browser
Private IPv4: 10.0.X.X       ← para colocar nos task definitions do ECS
```

> **IMPORTANTE:** Escreve o IP privado em algum lugar agora. Você vai precisar dele na Fase 4.

### 1.4 Verificar que o RabbitMQ subiu

Aguarda 3 minutos após a EC2 ficar `Running` (o Docker precisa de tempo para baixar a imagem).

Abre o browser e acessa:
```
http://<IP_PUBLICO_DA_EC2>:15672
```

Deve aparecer uma tela de login do RabbitMQ. Entra com:
- Username: `admin`
- Password: `admin`

Se aparecer o painel com **Overview** e **Connections**, o RabbitMQ está funcionando.

---

## FASE 2 — Banco de Dados (SENAC — sem RDS)

> **O banco do SENAC é acessível de qualquer rede.** Não precisamos criar RDS na AWS. Os containers ECS vão se conectar diretamente ao `edumysql.acesso.rj.senac.br:3306` usando as mesmas credenciais que já funcionam no Jenkins.

### 2.1 Verificar conectividade (opcional mas recomendado)

Antes de prosseguir, confirma que o banco responde pela EC2 de builds:

```bash
# Instala o cliente MySQL se necessário
sudo dnf install -y mysql

# Testa conexão com o banco do MS Cliente
mysql -h edumysql.acesso.rj.senac.br \
      -u 20261_projint5_manha \
      -p"senac@12938" \
      20261_projint5_manha_hotel_cliente \
      -e "SHOW TABLES;"
```

Se listar as tabelas, está tudo certo — o banco já existe com as tabelas criadas pelo Jenkins.

> **Não cria nem altera nada no banco.** As tabelas já existem e os dados de produção estão lá. O `prisma db push` nos Dockerfiles do MS Reserva e MS Quarto vai verificar o schema e, se estiver tudo em dia, apenas confirmar sem alterar nada.

### 2.2 Nenhuma ação necessária — continue para a Fase 3

O `DATABASE_URL` de cada MS já está definido nos task definitions da Fase 3 com os valores reais do SENAC. Não há nada a configurar aqui.

---

## FASE 3 — ECR (repositórios de imagens Docker)

> **O que é ECR?** É o serviço de registro de imagens Docker da AWS. É tipo um "Docker Hub" privado dentro da sua conta AWS. Vamos criar um repositório para cada serviço e enviar (push) as imagens para lá.

### 3.1 Criar os repositórios ECR

**Na EC2 de builds, executa:**

```bash
# Pega o ID da conta AWS automaticamente
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"

echo "Account ID: $ACCOUNT_ID"

# Cria os 5 repositórios
aws ecr create-repository --repository-name hotel-front     --region $REGION
aws ecr create-repository --repository-name hotel-cliente   --region $REGION
aws ecr create-repository --repository-name hotel-reserva   --region $REGION
aws ecr create-repository --repository-name hotel-quarto    --region $REGION
aws ecr create-repository --repository-name hotel-pagamento --region $REGION
```

Para confirmar que foram criados:
```bash
aws ecr describe-repositories --query 'repositories[*].repositoryName' --output table
```

Deve mostrar os 5 nomes.

### 3.2 Autenticar o Docker no ECR

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS \
  --password-stdin $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

Deve aparecer: `Login Succeeded`

### 3.3 Build e Push de cada imagem

> **O que é build?** É o processo de criar a imagem Docker a partir do Dockerfile.
> **O que é push?** É enviar essa imagem para o ECR.

**Front-end:**
```bash
cd ~/hotel/frontHotelaria

docker build --tag hotel-front .

docker tag hotel-front:latest \
  $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-front:latest

docker push \
  $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-front:latest
```

**MS Cliente:**
```bash
cd ~/hotel/PI_hotel_cliente

docker build --tag hotel-cliente .

docker tag hotel-cliente:latest \
  $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-cliente:latest

docker push \
  $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-cliente:latest
```

**MS Reserva:**
```bash
cd ~/hotel/PI_Hotel_Reserva

docker build --tag hotel-reserva .

docker tag hotel-reserva:latest \
  $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-reserva:latest

docker push \
  $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-reserva:latest
```

**MS Quarto:**
```bash
cd ~/hotel/pi_hotel_quarto

docker build --tag hotel-quarto .

docker tag hotel-quarto:latest \
  $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-quarto:latest

docker push \
  $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-quarto:latest
```

**MS Pagamento:**
```bash
cd ~/hotel/api_hotel_pagamento

docker build --tag hotel-pagamento .

docker tag hotel-pagamento:latest \
  $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-pagamento:latest

docker push \
  $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-pagamento:latest
```

Para confirmar que todas as imagens estão no ECR:
```bash
aws ecr list-images --repository-name hotel-front     --query 'imageIds[*].imageTag'
aws ecr list-images --repository-name hotel-cliente   --query 'imageIds[*].imageTag'
aws ecr list-images --repository-name hotel-reserva   --query 'imageIds[*].imageTag'
aws ecr list-images --repository-name hotel-quarto    --query 'imageIds[*].imageTag'
aws ecr list-images --repository-name hotel-pagamento --query 'imageIds[*].imageTag'
```

Cada comando deve retornar `["latest"]`.

---

## FASE 4 — Task Definitions (configuração dos containers no ECS)

> **O que é uma Task Definition?** É o "receituário" que diz ao ECS como rodar cada container: qual imagem usar, quanta CPU/memória alocar, quais portas abrir, quais variáveis de ambiente injetar. É um arquivo JSON.

### 4.1 Criar os grupos de log no CloudWatch

Os containers vão enviar seus logs para o CloudWatch. Precisamos criar os grupos antes.

```bash
aws logs create-log-group --log-group-name /ecs/hotel-front
aws logs create-log-group --log-group-name /ecs/hotel-cliente
aws logs create-log-group --log-group-name /ecs/hotel-reserva
aws logs create-log-group --log-group-name /ecs/hotel-quarto
aws logs create-log-group --log-group-name /ecs/hotel-pagamento
```

### 4.2 Criar a pasta de deploy

```bash
mkdir -p ~/hotel/hotel-deploy
cd ~/hotel/hotel-deploy
```

### 4.3 Preencher os valores reais

Antes de criar os arquivos, você precisa ter em mãos apenas **2 valores** da AWS (o banco vem direto do SENAC):

| Variável | Onde buscar | Exemplo |
|----------|-------------|---------|
| `ACCOUNT_ID` | `aws sts get-caller-identity --query Account --output text` | `123456789012` |
| `RABBITMQ_PRIVATE_IP` | EC2 → hotel-rabbitmq → Details → Private IPv4 | `10.0.1.45` |

> `DATABASE_URL`, `JWT_SECRET` e todos os outros valores já estão escritos diretamente nos JSON abaixo — não precisam ser buscados.

### 4.4 Arquivo: taskdef-front.json

> **Observação:** O front-end usa `VITE_*` para as URLs dos MS. Essas variáveis são usadas pelo Vite no momento do build (que acontece dentro do container quando ele inicia). Por isso colocamos elas como env vars do ECS — quando o container iniciar e rodar `npm run build`, o Vite vai pegar os valores de lá.
>
> **IMPORTANTE:** O DNS do ALB ainda não existe neste momento. Você vai criar o ALB na Fase 6 e depois voltar aqui para atualizar o valor de `ALB_DNS`.

```bash
cat > ~/hotel/hotel-deploy/taskdef-front.json << 'EOF'
{
  "family": "hotel-front",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/LabRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/LabRole",
  "containerDefinitions": [
    {
      "name": "hotel-front",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-front:IMAGE1_NAME",
      "portMappings": [
        {
          "containerPort": 9540,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "PORT",                "value": "9540" },
        { "name": "VITE_USUARIO_API",   "value": "http://ALB_DNS:9531" },
        { "name": "VITE_QUARTO_API",    "value": "http://ALB_DNS:9533" },
        { "name": "VITE_RESERVA_API",   "value": "http://ALB_DNS:9532" },
        { "name": "VITE_PAGAMENTO_API", "value": "http://ALB_DNS:9534" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/hotel-front",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF
```

### 4.5 Arquivo: taskdef-cliente.json

> Todas as variáveis vêm do `dev5.env`. `DATABASE_URL`, `RABBITMQ_URL` e as URLs de serviço são substituídas pelos valores AWS.

```bash
cat > ~/hotel/hotel-deploy/taskdef-cliente.json << 'EOF'
{
  "family": "hotel-cliente",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/LabRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/LabRole",
  "containerDefinitions": [
    {
      "name": "hotel-cliente",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-cliente:IMAGE1_NAME",
      "portMappings": [{ "containerPort": 9531, "protocol": "tcp" }],
      "environment": [
        { "name": "DATABASE_URL",          "value": "mysql://20261_projint5_manha:senac%4012938@edumysql.acesso.rj.senac.br:3306/20261_projint5_manha_hotel_cliente" },
        { "name": "JWT_SECRET",            "value": "segredo" },
        { "name": "PORT",                  "value": "9531" },
        { "name": "RABBITMQ_URL",          "value": "amqp://admin:admin@RABBITMQ_PRIVATE_IP:5672" },
        { "name": "URL_SERVICO_PAGAMENTO", "value": "http://ALB_DNS:9534" },
        { "name": "URL_SERVICO_QUARTO",    "value": "http://ALB_DNS:9533/api/quarto" },
        { "name": "URL_SERVICO_RESERVA",   "value": "http://ALB_DNS:9532/reservas" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/hotel-cliente",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF
```

### 4.6 Arquivo: taskdef-reserva.json

> Variáveis do `dev9.env`. `CLIENTE_API_URL` aponta para o MS Cliente pelo ALB — a barra final é removida pelo código automaticamente. `QUARTO_API_URL` inclui o path `/api/quartos` que é como o MS Quarto expõe seus endpoints.

```bash
cat > ~/hotel/hotel-deploy/taskdef-reserva.json << 'EOF'
{
  "family": "hotel-reserva",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/LabRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/LabRole",
  "containerDefinitions": [
    {
      "name": "hotel-reserva",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-reserva:IMAGE1_NAME",
      "portMappings": [{ "containerPort": 9532, "protocol": "tcp" }],
      "environment": [
        { "name": "CLIENTE_API_URL", "value": "http://ALB_DNS:9531" },
        { "name": "DATABASE_URL",    "value": "mysql://20261_projint5_manha:senac%4012938@edumysql.acesso.rj.senac.br:3306/20261_projint5_manha_hotel_reserva" },
        { "name": "JWT_SECRET",      "value": "segredo" },
        { "name": "PORT",            "value": "9532" },
        { "name": "QUARTO_API_URL",  "value": "http://ALB_DNS:9533/api/quartos" },
        { "name": "RABBITMQ_URL",    "value": "amqp://admin:admin@RABBITMQ_PRIVATE_IP:5672" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/hotel-reserva",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF
```

### 4.7 Arquivo: taskdef-quarto.json

> Variáveis do `dev6.env`. O `URL_SERVICO_CLIENTE` do SENAC tinha um **typo** (`/20261prj5/cliente/reserva`) — corrigido aqui para apontar para o MS Cliente no ALB. O Dockerfile do repo AWS já foi alterado para usar `node src/server.js` com `prisma db push`.

```bash
cat > ~/hotel/hotel-deploy/taskdef-quarto.json << 'EOF'
{
  "family": "hotel-quarto",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/LabRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/LabRole",
  "containerDefinitions": [
    {
      "name": "hotel-quarto",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-quarto:IMAGE1_NAME",
      "portMappings": [{ "containerPort": 9533, "protocol": "tcp" }],
      "environment": [
        { "name": "DATABASE_URL",          "value": "mysql://20261_projint5_manha:senac%4012938@edumysql.acesso.rj.senac.br:3306/20261_projint5_manha_hotel_quarto" },
        { "name": "JWT_SECRET",            "value": "segredo" },
        { "name": "PORT",                  "value": "9533" },
        { "name": "RABBITMQ_URL",          "value": "amqp://admin:admin@RABBITMQ_PRIVATE_IP:5672" },
        { "name": "URL_SERVICO_CLIENTE",   "value": "http://ALB_DNS:9531" },
        { "name": "URL_SERVICO_PAGAMENTO", "value": "http://ALB_DNS:9534" },
        { "name": "URL_SERVICO_RESERVA",   "value": "http://ALB_DNS:9532/reservas" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/hotel-quarto",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF
```

### 4.8 Arquivo: taskdef-pagamento.json

> Variáveis do `dev8.env`. `AUTH_USER` e `AUTH_PASS` não aparecem no .env original — o endpoint `/auth/login` do MS Pagamento não é usado pelo front-end principal (que usa JWT via MS Cliente). Omitir essas variáveis é seguro para o demo.

```bash
cat > ~/hotel/hotel-deploy/taskdef-pagamento.json << 'EOF'
{
  "family": "hotel-pagamento",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/LabRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/LabRole",
  "containerDefinitions": [
    {
      "name": "hotel-pagamento",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-pagamento:IMAGE1_NAME",
      "portMappings": [{ "containerPort": 9534, "protocol": "tcp" }],
      "environment": [
        { "name": "DATABASE_URL",          "value": "mysql://20261_projint5_manha:senac%4012938@edumysql.acesso.rj.senac.br:3306/20261_projint5_manha_hotel_pagamento" },
        { "name": "JWT_SECRET",            "value": "segredo" },
        { "name": "PORT",                  "value": "9534" },
        { "name": "RABBITMQ_URL",          "value": "amqp://admin:admin@RABBITMQ_PRIVATE_IP:5672" },
        { "name": "URL_SERVICO_CLIENTE",   "value": "http://ALB_DNS:9531" },
        { "name": "URL_SERVICO_QUARTO",    "value": "http://ALB_DNS:9533" },
        { "name": "URL_SERVICO_RESERVA",   "value": "http://ALB_DNS:9532" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/hotel-pagamento",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF
```

### 4.9 Substituir os placeholders nos arquivos

Os task definitions têm apenas **3 placeholders** — DATABASE_URL e JWT_SECRET já estão escritos diretamente nos JSON:

| Placeholder | Quando preencher | Como obter |
|---|---|---|
| `ACCOUNT_ID` | Agora | `aws sts get-caller-identity --query Account --output text` |
| `RABBITMQ_PRIVATE_IP` | Após Fase 1 | Console EC2 → hotel-rabbitmq → Private IPv4 address |
| `ALB_DNS` | Após Fase 6 | Console EC2 → Load Balancers → hotelLB → DNS name |

```bash
# ─── PREENCHA OS 2 PRIMEIROS AGORA ──────────────────────────────────────
ACCOUNT_ID="123456789012"    # substitui pelo ID real da sua conta
RABBITMQ_IP="10.0.X.X"      # substitui após criar a EC2 na Fase 1
# ────────────────────────────────────────────────────────────────────────

cd ~/hotel/hotel-deploy

sed -i "s/ACCOUNT_ID/$ACCOUNT_ID/g"           taskdef-*.json
sed -i "s/RABBITMQ_PRIVATE_IP/$RABBITMQ_IP/g" taskdef-*.json
```

> **`ALB_DNS` fica como placeholder** em todos os 5 task definitions até a Fase 6. Após criar o ALB:
> ```bash
> ALB_DNS="hotelLB-1234567890.us-east-1.elb.amazonaws.com"
> sed -i "s|ALB_DNS|$ALB_DNS|g" taskdef-*.json
> ```

### 4.10 Aguardar a Fase 6 para registrar os task definitions

**Todos os 5 task definitions** contêm `ALB_DNS` — inclusive o MS Pagamento, que chama os outros MS pelas URLs `http://ALB_DNS:9531`, `:9533` e `:9532`. Nenhum pode ser registrado antes de criar o ALB.

> Continue para as Fases 5 e 6. Na Fase 6.5 você substitui `ALB_DNS` e registra todos de uma vez.

---

## FASE 5 — Target Groups

> **O que é um Target Group?** É um grupo de "alvos" (os containers) para onde o ALB vai mandar o tráfego. Cada serviço tem um target group próprio. Para o front-end precisamos de 2 (um para produção, um para o ambiente de teste do blue/green deploy).

Vamos criar 6 target groups no total. O processo é o mesmo para todos, só mudam nome e porta.

**Para cada target group:**
1. Vai em **EC2 → Target Groups**
2. Clica em **Create target group**
3. Preenche conforme a tabela abaixo
4. Clica em **Next** → **Create target group** (não adiciona targets agora — o ECS faz isso automaticamente)

### Configurações comuns a todos os Target Groups:

```
Target type: IP addresses      ← IMPORTANTE: não usar "Instances", usar "IP addresses"
Protocol: HTTP
VPC: LabVPC
Protocol version: HTTP1
```

### Tabela de configuração de cada Target Group:

| # | Nome | Porta | Health check path | Success codes |
|---|------|-------|------------------|---------------|
| 1 | `front-tg-one` | 9540 | `/` | `200` |
| 2 | `front-tg-two` | 9540 | `/` | `200` |
| 3 | `cliente-tg` | 9531 | `/usuario/login` | `200,405` |
| 4 | `reserva-tg` | 9532 | `/reservas` | `200,401` |
| 5 | `quarto-tg` | 9533 | `/api/quartos` | `200,401` |
| 6 | `pagamento-tg` | 9534 | `/pagamentos` | `200,401,403` |

> **Por que os success codes incluem 401?** O ALB faz um "health check" chamando a URL do health check. Como esses endpoints precisam de autenticação, eles retornam 401 (não autorizado). Se colocássemos só `200`, o ALB acharia que o container está com problema. Adicionando `200,401`, ele aceita 401 como sinal de que o container está vivo e respondendo.

**Para cada target group, na seção "Health checks":**
- Clica em **Advanced health check settings**
- Em **Success codes**, coloca os valores da tabela (ex: `200,401`)

---

## FASE 6 — Security Group do ECS + ALB

> **O que é um ALB (Application Load Balancer)?** É o "porteiro" da sua aplicação. Ele recebe as requisições da internet e distribui para os containers certos com base na porta usada.

### 6.1 Criar o Security Group do ECS/ALB

1. Vai em **EC2 → Security Groups**
2. Clica em **Create security group**
3. Preenche:

```
Security group name: hotel-sg
Description: ECS e ALB do projeto hotel
VPC: LabVPC
```

**Inbound rules** — clica em **Add rule** para cada linha:

| Type | Port range | Source | Description |
|------|-----------|--------|-------------|
| HTTP | 80 | 0.0.0.0/0 | Front-end produção |
| Custom TCP | 8080 | 0.0.0.0/0 | Front-end teste (blue/green) |
| Custom TCP | 9531 | 0.0.0.0/0 | MS Cliente |
| Custom TCP | 9532 | 0.0.0.0/0 | MS Reserva |
| Custom TCP | 9533 | 0.0.0.0/0 | MS Quarto |
| Custom TCP | 9534 | 0.0.0.0/0 | MS Pagamento |
| Custom TCP | 9540 | 0.0.0.0/0 | Front-end container |

**Outbound rules:** deixa o padrão (`All traffic → 0.0.0.0/0`).

Clica em **Create security group**.

### 6.2 Criar o ALB

1. Vai em **EC2 → Load Balancers**
2. Clica em **Create load balancer**
3. Seleciona **Application Load Balancer** → Clica em **Create**
4. Preenche:

**Basic configuration:**
```
Name: hotelLB
Scheme: Internet-facing
IP address type: IPv4
```

**Network mapping:**
```
VPC: LabVPC
Mappings: marcar us-east-1a (Public Subnet 1) e us-east-1b (Public Subnet 2)
```

**Security groups:**
- Remove o security group padrão que vem selecionado
- Seleciona `hotel-sg`

**Listeners and routing** — vai configurar o primeiro listener aqui e os outros depois:
```
Protocol: HTTP
Port: 80
Default action: Forward to → front-tg-one
```

Clica em **Create load balancer**.

### 6.3 Adicionar os outros 5 listeners

Após o ALB ser criado, clica nele e vai na aba **Listeners and rules**. Para cada listener abaixo, clica em **Add listener**:

| Port | Protocol | Forward to |
|------|----------|-----------|
| 8080 | HTTP | `front-tg-two` |
| 9531 | HTTP | `cliente-tg` |
| 9532 | HTTP | `reserva-tg` |
| 9533 | HTTP | `quarto-tg` |
| 9534 | HTTP | `pagamento-tg` |

Para cada um:
1. Clica em **Add listener**
2. Preenche Protocol: HTTP, Port: (o número da tabela)
3. Em Default actions: seleciona **Forward** → escolhe o target group correspondente
4. Clica em **Add**

### 6.4 Anotar o DNS do ALB

Na página do load balancer, na aba **Details**, copia o **DNS name**:

```
hotelLB-1234567890.us-east-1.elb.amazonaws.com
```

> **Anota esse DNS.** Vamos substituir nos taskdef-front.json e taskdef-reserva.json agora.

### 6.5 Substituir ALB_DNS em todos os task definitions

**Todos os 5 task definitions** usam o DNS do ALB.

```bash
ALB_DNS="hotelLB-1234567890.us-east-1.elb.amazonaws.com"  # coloca o DNS real aqui

cd ~/hotel/hotel-deploy

sed -i "s|ALB_DNS|$ALB_DNS|g" taskdef-*.json
```

Verifica se ficou correto:

```bash
grep "VITE_USUARIO_API"    taskdef-front.json     # deve mostrar o DNS real
grep "URL_SERVICO_RESERVA" taskdef-cliente.json   # deve mostrar o DNS real
grep "CLIENTE_API_URL"     taskdef-reserva.json   # deve mostrar o DNS real
grep "URL_SERVICO_RESERVA" taskdef-quarto.json    # deve mostrar o DNS real
grep "URL_SERVICO_CLIENTE" taskdef-pagamento.json # deve mostrar o DNS real
```

Todos devem mostrar a URL com o DNS do ALB em vez de `ALB_DNS`.

### 6.6 Registrar os 5 task definitions

```bash
cd ~/hotel/hotel-deploy

aws ecs register-task-definition --cli-input-json file://taskdef-front.json
aws ecs register-task-definition --cli-input-json file://taskdef-cliente.json
aws ecs register-task-definition --cli-input-json file://taskdef-reserva.json
aws ecs register-task-definition --cli-input-json file://taskdef-quarto.json
aws ecs register-task-definition --cli-input-json file://taskdef-pagamento.json
```

Para confirmar que todos os 5 foram registrados:

```bash
aws ecs list-task-definitions --query 'taskDefinitionArns' --output table
```

Deve mostrar 5 linhas: `hotel-front:1`, `hotel-cliente:1`, `hotel-reserva:1`, `hotel-quarto:1`, `hotel-pagamento:1`.

---

## FASE 7 — ECS Cluster

> **O que é ECS Fargate?** É o serviço da AWS que roda containers sem você precisar gerenciar servidores. Você só diz "quero rodar esse container com esse task definition" e a AWS cuida do resto.

### 7.1 Criar o Cluster

1. Vai em **ECS → Clusters**
2. Clica em **Create cluster**
3. Preenche:

```
Cluster name: hotel-cluster
Infrastructure: AWS Fargate (serverless)  ← marcar essa opção
```

Clica em **Create**.

> Se já existir um cluster de exercícios anteriores (ex: `microservices-serverlesscluster`), você pode reutilizá-lo — não precisa criar um novo.

### 7.2 Criar os arquivos de serviço ECS

```bash
# Pega os IDs das subnets automaticamente
SUBNET1=$(aws ec2 describe-subnets \
  --filters "Name=tag:Name,Values=Public Subnet 1" \
  --query 'Subnets[0].SubnetId' --output text)

SUBNET2=$(aws ec2 describe-subnets \
  --filters "Name=tag:Name,Values=Public Subnet 2" \
  --query 'Subnets[0].SubnetId' --output text)

SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=hotel-sg" \
  --query 'SecurityGroups[0].GroupId' --output text)

echo "Subnet 1: $SUBNET1"
echo "Subnet 2: $SUBNET2"
echo "Security Group: $SG_ID"
```

**Arquivo: create-front-service.json** (usa CodeDeploy para blue/green)

```bash
cat > ~/hotel/hotel-deploy/create-front-service.json << EOF
{
  "cluster": "hotel-cluster",
  "serviceName": "front-service",
  "taskDefinition": "hotel-front",
  "desiredCount": 1,
  "launchType": "FARGATE",
  "deploymentController": {
    "type": "CODE_DEPLOY"
  },
  "loadBalancers": [
    {
      "targetGroupArn": "$(aws elbv2 describe-target-groups --names front-tg-one --query 'TargetGroups[0].TargetGroupArn' --output text)",
      "containerName": "hotel-front",
      "containerPort": 9540
    }
  ],
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": ["$SUBNET1", "$SUBNET2"],
      "securityGroups": ["$SG_ID"],
      "assignPublicIp": "ENABLED"
    }
  }
}
EOF
```

**Arquivo: create-cliente-service.json** (usa rolling update simples)

```bash
cat > ~/hotel/hotel-deploy/create-cliente-service.json << EOF
{
  "cluster": "hotel-cluster",
  "serviceName": "cliente-service",
  "taskDefinition": "hotel-cliente",
  "desiredCount": 1,
  "launchType": "FARGATE",
  "deploymentController": {
    "type": "ECS"
  },
  "loadBalancers": [
    {
      "targetGroupArn": "$(aws elbv2 describe-target-groups --names cliente-tg --query 'TargetGroups[0].TargetGroupArn' --output text)",
      "containerName": "hotel-cliente",
      "containerPort": 9531
    }
  ],
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": ["$SUBNET1", "$SUBNET2"],
      "securityGroups": ["$SG_ID"],
      "assignPublicIp": "ENABLED"
    }
  }
}
EOF
```

**Arquivo: create-reserva-service.json**

```bash
cat > ~/hotel/hotel-deploy/create-reserva-service.json << EOF
{
  "cluster": "hotel-cluster",
  "serviceName": "reserva-service",
  "taskDefinition": "hotel-reserva",
  "desiredCount": 1,
  "launchType": "FARGATE",
  "deploymentController": {
    "type": "ECS"
  },
  "loadBalancers": [
    {
      "targetGroupArn": "$(aws elbv2 describe-target-groups --names reserva-tg --query 'TargetGroups[0].TargetGroupArn' --output text)",
      "containerName": "hotel-reserva",
      "containerPort": 9532
    }
  ],
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": ["$SUBNET1", "$SUBNET2"],
      "securityGroups": ["$SG_ID"],
      "assignPublicIp": "ENABLED"
    }
  }
}
EOF
```

**Arquivo: create-quarto-service.json**

```bash
cat > ~/hotel/hotel-deploy/create-quarto-service.json << EOF
{
  "cluster": "hotel-cluster",
  "serviceName": "quarto-service",
  "taskDefinition": "hotel-quarto",
  "desiredCount": 1,
  "launchType": "FARGATE",
  "deploymentController": {
    "type": "ECS"
  },
  "loadBalancers": [
    {
      "targetGroupArn": "$(aws elbv2 describe-target-groups --names quarto-tg --query 'TargetGroups[0].TargetGroupArn' --output text)",
      "containerName": "hotel-quarto",
      "containerPort": 9533
    }
  ],
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": ["$SUBNET1", "$SUBNET2"],
      "securityGroups": ["$SG_ID"],
      "assignPublicIp": "ENABLED"
    }
  }
}
EOF
```

**Arquivo: create-pagamento-service.json**

```bash
cat > ~/hotel/hotel-deploy/create-pagamento-service.json << EOF
{
  "cluster": "hotel-cluster",
  "serviceName": "pagamento-service",
  "taskDefinition": "hotel-pagamento",
  "desiredCount": 1,
  "launchType": "FARGATE",
  "deploymentController": {
    "type": "ECS"
  },
  "loadBalancers": [
    {
      "targetGroupArn": "$(aws elbv2 describe-target-groups --names pagamento-tg --query 'TargetGroups[0].TargetGroupArn' --output text)",
      "containerName": "hotel-pagamento",
      "containerPort": 9534
    }
  ],
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": ["$SUBNET1", "$SUBNET2"],
      "securityGroups": ["$SG_ID"],
      "assignPublicIp": "ENABLED"
    }
  }
}
EOF
```

### 7.3 Criar os 5 serviços ECS

```bash
cd ~/hotel/hotel-deploy

# Primeiro o front (blue/green — CodeDeploy vai assumir depois)
aws ecs create-service --cli-input-json file://create-front-service.json

# Depois os 4 MS (rolling update)
aws ecs create-service --cli-input-json file://create-cliente-service.json
aws ecs create-service --cli-input-json file://create-reserva-service.json
aws ecs create-service --cli-input-json file://create-quarto-service.json
aws ecs create-service --cli-input-json file://create-pagamento-service.json
```

### 7.4 Verificar se os serviços estão rodando

No console: **ECS → Clusters → hotel-cluster → Services**

Para cada serviço, clica nele e vai na aba **Tasks**. Aguarda até todas as tasks ficarem com status `RUNNING` (pode levar 2-5 minutos por serviço).

Se algum serviço ficar em `PENDING` por muito tempo ou entrar em loop de restart:
- Clica na task → aba **Logs** → veja o erro
- Problema mais comum: credenciais erradas no DATABASE_URL ou RABBITMQ_URL

---

## FASE 8 — CodeCommit (repositório de arquivos de deploy)

> **O que é o CodeCommit?** É o Git da AWS. Vamos criar um repositório lá para guardar os arquivos de configuração do deploy (taskdef e appspec). O CodePipeline vai monitorar esse repo e acionar o deploy quando houver mudança.

### 8.1 Criar o repositório

```bash
aws codecommit create-repository \
  --repository-name hotel-deploy \
  --repository-description "Arquivos de deploy do projeto hotel"
```

Anota a URL do repositório que aparece no output (`cloneUrlHttp`).

### 8.2 Criar os AppSpec files

> **O que é AppSpec?** É um arquivo que diz ao CodeDeploy qual container trocar durante o deploy blue/green.

**appspec-front.yaml:**
```bash
cat > ~/hotel/hotel-deploy/appspec-front.yaml << 'EOF'
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: <TASK_DEFINITION>
        LoadBalancerInfo:
          ContainerName: "hotel-front"
          ContainerPort: 9540
        PlatformVersion: "LATEST"
EOF
```

Para os MS com rolling update (cliente, reserva, quarto, pagamento), cria um appspec de cada:

```bash
for ms in cliente reserva quarto pagamento; do
cat > ~/hotel/hotel-deploy/appspec-${ms}.yaml << EOF
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: <TASK_DEFINITION>
        LoadBalancerInfo:
          ContainerName: "hotel-${ms}"
          ContainerPort: $(case $ms in cliente) echo 9531;; reserva) echo 9532;; quarto) echo 9533;; pagamento) echo 9534;; esac)
        PlatformVersion: "LATEST"
EOF
done
```

### 8.3 Criar imagedefinitions para os MS (rolling update)

Para os MS que usam rolling update (não blue/green), o CodePipeline precisa de um arquivo `imagedefinitions.json` em vez do AppSpec:

```bash
for ms in cliente reserva quarto pagamento; do
  PORT=$(case $ms in cliente) echo 9531;; reserva) echo 9532;; quarto) echo 9533;; pagamento) echo 9534;; esac)
  cat > ~/hotel/hotel-deploy/imagedefinitions-${ms}.json << EOF
[{"name":"hotel-${ms}","imageUri":"$ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hotel-${ms}:latest"}]
EOF
done
```

### 8.4 Push de todos os arquivos para o CodeCommit

```bash
cd ~/hotel/hotel-deploy

git init
git add .
git commit -m "Arquivos de deploy do projeto hotel"

# Configura o remote (substitui pela URL do seu repo CodeCommit)
git remote add origin https://git-codecommit.us-east-1.amazonaws.com/v1/repos/hotel-deploy
git push -u origin main
```

---

## FASE 9 — CodeDeploy (Blue/Green para o Front-end)

> **O que é Blue/Green?** É uma estratégia de deploy sem downtime. Enquanto a versão atual (Blue) continua atendendo os usuários, a nova versão (Green) é subida em paralelo. Após validação, o tráfego é chaveado para o Green. Se der problema, reverte instantaneamente para o Blue.

### 9.1 Criar a aplicação CodeDeploy

1. Vai em **CodeDeploy → Applications**
2. Clica em **Create application**
3. Preenche:

```
Application name: hotel-deploy
Compute platform: Amazon ECS
```

Clica em **Create application**.

### 9.2 Criar o Deployment Group

1. Dentro da aplicação `hotel-deploy`, clica em **Create deployment group**
2. Preenche:

```
Deployment group name: hotel-front-dg
Service role: arn:aws:iam::<ACCOUNT_ID>:role/LabRole
```

**ECS cluster and service name:**
```
ECS cluster name: hotel-cluster
ECS service name: front-service
```

**Load balancer:**
```
Load balancer: hotelLB
Production listener port: HTTP:80
Test listener port: HTTP:8080
Target group 1 name: front-tg-one
Target group 2 name: front-tg-two
```

**Deployment settings:**
```
Reroute traffic: immediately
Original revision termination: 0 Days, 0 Hours, 5 Minutes
```

Clica em **Create deployment group**.

---

## FASE 10 — CodePipeline (CI/CD Automático)

> **O que é CodePipeline?** É o serviço que automatiza o processo de build e deploy. Quando uma nova imagem é enviada ao ECR, o pipeline detecta, pega o task definition atualizado e faz o deploy automaticamente.

### Pipeline do Front-end (Blue/Green)

1. Vai em **CodePipeline → Pipelines**
2. Clica em **Create pipeline**

**Step 1 — Pipeline settings:**
```
Pipeline name: pipeline-hotel-front
Service role: Existing service role → LabRole (ou PipelineRole se disponível)
```

**Step 2 — Add source stage:**

Clica em **Add source** para adicionar duas fontes:

**Source 1 (arquivos de deploy):**
```
Source provider: AWS CodeCommit
Repository name: hotel-deploy
Branch name: main
Output artifact format: CodePipeline default
Variable namespace: SourceVariables
```

**Source 2 (imagem Docker):**
```
Source provider: Amazon ECR
Repository name: hotel-front
Image tag: latest
Output artifact name: ImageArtifact
```

**Step 3 — Skip build stage** (não precisa de build separado)

**Step 4 — Add deploy stage:**
```
Deploy provider: Amazon ECS (Blue/Green)
AWS CodeDeploy application name: hotel-deploy
AWS CodeDeploy deployment group: hotel-front-dg
Amazon ECS task definition:
  - Artifact name: SourceArtifact
  - File name: taskdef-front.json
AWS CodeDeploy AppSpec file:
  - Artifact name: SourceArtifact
  - File name: appspec-front.yaml
Input artifacts with image details:
  - Image artifact: ImageArtifact
  - Placeholder: IMAGE1_NAME
```

> **O que é IMAGE1_NAME?** No `taskdef-front.json`, a imagem está como `...:IMAGE1_NAME`. O CodePipeline substitui esse placeholder pela URI da imagem real que acabou de ser enviada ao ECR.

Clica em **Create pipeline**.

---

### Pipelines dos MS (Rolling Update)

Repete o processo 4 vezes, uma para cada MS. As diferenças estão na tabela:

| Pipeline | ECR repo | Task definition | AppSpec | Container |
|----------|----------|----------------|---------|-----------|
| `pipeline-hotel-cliente` | `hotel-cliente` | `taskdef-cliente.json` | — | — |
| `pipeline-hotel-reserva` | `hotel-reserva` | `taskdef-reserva.json` | — | — |
| `pipeline-hotel-quarto` | `hotel-quarto` | `taskdef-quarto.json` | — | — |
| `pipeline-hotel-pagamento` | `hotel-pagamento` | `taskdef-pagamento.json` | — | — |

Para cada um:

**Step 4 — Add deploy stage (MS — rolling update):**
```
Deploy provider: Amazon ECS
Cluster name: hotel-cluster
Service name: <nome-do-servico> (ex: cliente-service)
Image definitions file: imagedefinitions-<ms>.json
```

> Para rolling update no ECS, não usa CodeDeploy/AppSpec. O CodePipeline atualiza o service diretamente com a nova imagem.

---

## FASE 11 — Validação Final

### 11.1 Verificar todos os serviços rodando

No console: **ECS → Clusters → hotel-cluster → Services**

Todos os 5 serviços devem mostrar:
- Desired count: 1
- Running count: 1
- Status: ACTIVE

### 11.2 Verificar os Target Groups saudáveis

**EC2 → Target Groups** — clica em cada target group e vai na aba **Targets**:

- Status deve ser `healthy` para todos
- Se estiver `unhealthy`: clica na task unhealthy → vê o motivo na coluna "Health status details"

### 11.3 Testar os endpoints

Substitui `<ALB_DNS>` pelo DNS real do seu ALB:

```
# Front-end (deve carregar a tela do hotel)
http://<ALB_DNS>/

# MS Cliente (deve retornar 405 Method Not Allowed — esperado para GET em /usuario/login)
http://<ALB_DNS>:9531/usuario/login

# MS Reserva (deve retornar 401 — esperado, endpoint protegido)
http://<ALB_DNS>:9532/reservas

# MS Quarto (deve retornar 401 ou lista de quartos se público)
http://<ALB_DNS>:9533/api/quartos

# MS Pagamento (deve retornar 401 — endpoint protegido)
http://<ALB_DNS>:9534/pagamentos
```

### 11.4 Testar o login completo pelo front-end

1. Acessa `http://<ALB_DNS>/`
2. Tenta fazer login com um usuário cadastrado
3. Navega pelas telas de quartos, reservas

> **Se o login funcionar e as telas carregarem os dados**: o deploy está completo e funcionando!

---

## RESOLUÇÃO DE PROBLEMAS COMUNS

### "Task ficou em PENDING e nunca ficou RUNNING"

**Causa mais comum:** Erro nas credenciais do banco de dados.

1. Vai em **ECS → Clusters → hotel-cluster → Tasks**
2. Clica na task com problema → aba **Logs**
3. Lê a mensagem de erro

Erros comuns:
- `Access denied for user 'admin'@...` → senha errada no DATABASE_URL
- `Can't connect to MySQL server` → endpoint do RDS errado ou security group bloqueando
- `connect ECONNREFUSED <IP>:5672` → IP do RabbitMQ errado ou EC2 desligada

### "Health check failing no target group"

**Verificação:**
1. Clica no target group → aba **Targets**
2. Vê o motivo: `Target.ResponseCodeMismatch` = código HTTP inesperado

Solução: ajusta os **Success codes** do health check para incluir o código que o endpoint retorna (ex: `200,401,405`).

### "Container sobe mas responde 500 em todos os endpoints"

**Causa mais provável:** Variável de ambiente faltando ou com valor errado (ex: JWT_SECRET vazio).

**Como verificar:**
1. **ECS → Clusters → hotel-cluster → Tasks** → clica na task
2. Aba **Logs** → lê o erro na inicialização

Erros comuns:
- `secretOrPrivateKey must have a value` → `JWT_SECRET` está vazio ou não foi preenchido no taskdef
- `Cannot read property of undefined` → alguma variável `process.env.ALGO` está `undefined`

**Solução:** Atualiza o task definition com o valor correto → faz um novo deploy do service.

### "O front-end carrega mas as chamadas para os MS dão erro de CORS ou de rede"

**Causa:** As variáveis `VITE_*` podem ter ficado com o valor antigo (do SENAC) na imagem Docker.

Solução:
1. Verifica se os valores no `taskdef-front.json` estão corretos
2. Faz novo push da imagem front-end para o ECR (o build acontece dentro do container, então o push da mesma imagem sem código novo já recompila com os novos env vars se o task definition foi atualizado)
3. Na verdade, o correto é: atualiza o task definition com os valores corretos → faz um novo deploy manual no ECS service → o container novo vai buildar o front com os valores novos

### "Pipeline falhou no step de Source"

**Causa:** O CodeCommit está vazio ou o arquivo referenciado não existe.

1. Vai em **CodeCommit → Repositories → hotel-deploy**
2. Verifica se os arquivos `taskdef-*.json` e `appspec-*.yaml` estão lá
3. Se não estiverem, faz o push novamente (Fase 8.4)

---

## RESUMO DE TODOS OS VALORES QUE VOCÊ PRECISA ANOTAR

Preenche à medida que for criando cada recurso. Se perder algum valor, a Fase 0 explica como recuperar os do Infisical.

```
─── DA AWS (você cria) ────────────────────────────────────────────────────
ACCOUNT_ID:           ______________________________   (aws sts get-caller-identity)
RABBITMQ_PUBLIC_IP:   ______________________________   (EC2 → hotel-rabbitmq → Public IPv4)
RABBITMQ_PRIVATE_IP:  ______________________________   (EC2 → hotel-rabbitmq → Private IPv4)
ALB_DNS:              ______________________________   (EC2 → Load Balancers → DNS name)

─── JÁ CONHECIDOS (do Infisical / .env) ──────────────────────────────────
JWT_SECRET:           segredo                          (igual em todos os MS)
DATABASE_URL:         mysql://20261_projint5_manha:senac%4012938@edumysql...  (SENAC — já nos JSONs)
RABBITMQ_URL:         amqp://admin:admin@<RABBITMQ_PRIVATE_IP>:5672
```

---

## CUSTO ESTIMADO DO LAB (para referência)

| Recurso | Tipo | Custo estimado/hora |
|---------|------|---------------------|
| EC2 hotel-rabbitmq | t3.micro | $0.013 |
| ALB hotelLB | Application LB | $0.008 + $0.008/LCU |
| ECS Fargate (5 tasks) | 0.25 vCPU × 5 | ~$0.040 |
| ECR (armazenamento) | ~2 GB | ~$0.001 |
| **Total aproximado** | | **~$0.06/hora (~$1.5/dia)** |

> Sem RDS o custo fica ainda menor — usando o banco do SENAC que já existe.

> **Desligue os recursos quando não estiver usando** para não gastar os créditos do lab. Para pausar: pare os ECS services (desiredCount = 0) e pare a EC2.
