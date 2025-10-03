# MS Audit - Microsserviço de Auditoria

Microsserviço responsável por toda a auditoria médica, compliance, pendências de validação e relatórios de conformidade do sistema Lazarus.

## 🎯 Funcionalidades

### 📋 Audit Logs
- **Criação automática** de logs de auditoria para todas as ações do sistema
- **Rastreamento completo** de alterações em entidades
- **Flags de compliance** automáticas
- **Categorização** por severidade e tipo de ação
- **Busca avançada** com filtros múltiplos
- **Estatísticas** detalhadas de auditoria

### ⚠️ Validation Pendencies
- **Criação automática** de pendências de validação
- **Sistema de risco** com score automático (0-100)
- **Workflow de aprovação** hierárquico
- **Auto-atribuição** baseada em categoria e risco
- **Sistema de comentários** e evidências
- **Escalação automática** com mudança de prioridade
- **Transições de status** validadas

### 📊 Compliance Reports
- **Geração automática** de relatórios de compliance
- **Cálculo automático** de métricas de conformidade
- **Análise de risco** com score geral
- **Achados e recomendações** automáticos
- **Workflow de aprovação** e publicação
- **Relatórios periódicos** automatizados

### 🔧 Audit Rules
- **Motor de regras** configurável
- **Condições complexas** com operadores lógicos
- **Ações automáticas** (LOG, ALERT, ESCALATE, NOTIFY)
- **Execução em tempo real** para logs de auditoria
- **Estatísticas de execução** detalhadas
- **Validação robusta** de regras

## 🏗️ Arquitetura

### 📊 CQRS (Command Query Responsibility Segregation)
- **PostgreSQL** (Azure Database) para operações de escrita
- **Cosmos DB** (MongoDB API) para operações de leitura otimizadas
- **Sincronização automática** entre bases de dados
- **Redis** para cache de consultas frequentes

### 🔄 Event-Driven Architecture
- **Kafka/Service Bus** para comunicação assíncrona
- **Eventos** publicados para todas as operações
- **Integração** com outros microsserviços
- **Processamento** em tempo real

### 🛡️ Segurança e Compliance
- **JWT Authentication** com roles específicas
- **Autorização granular** por endpoint
- **Rate limiting** por IP
- **Logs de auditoria** para todas as ações
- **Validação robusta** de dados

## 🚀 Tecnologias

- **Node.js** + **TypeScript**
- **Express.js** com middleware avançado
- **Prisma ORM** para PostgreSQL
- **Mongoose** para MongoDB/Cosmos DB
- **Joi** para validação de dados
- **Winston** para logging estruturado
- **Swagger** para documentação de API
- **Docker** para containerização

## 📡 Endpoints Principais

### Audit Logs
- `POST /api/v1/audit/logs` - Criar log de auditoria
- `GET /api/v1/audit/logs` - Listar logs com filtros
- `GET /api/v1/audit/logs/:id` - Buscar log por ID
- `GET /api/v1/audit/logs/entity/:entityType/:entityId` - Logs por entidade
- `GET /api/v1/audit/logs/statistics` - Estatísticas de auditoria

### Validation Pendencies
- `POST /api/v1/audit/pendencies` - Criar pendência
- `GET /api/v1/audit/pendencies` - Listar pendências
- `GET /api/v1/audit/pendencies/:id` - Buscar pendência por ID
- `PUT /api/v1/audit/pendencies/:id` - Atualizar pendência
- `DELETE /api/v1/audit/pendencies/:id` - Deletar pendência
- `POST /api/v1/audit/pendencies/:id/comments` - Adicionar comentário
- `PATCH /api/v1/audit/pendencies/:id/escalate` - Escalar pendência

### Compliance Reports
- `POST /api/v1/audit/reports` - Criar relatório
- `GET /api/v1/audit/reports` - Listar relatórios
- `GET /api/v1/audit/reports/:id` - Buscar relatório por ID
- `PUT /api/v1/audit/reports/:id` - Atualizar relatório
- `POST /api/v1/audit/reports/generate/periodic` - Gerar relatório periódico

### Audit Rules
- `POST /api/v1/audit/rules` - Criar regra
- `GET /api/v1/audit/rules` - Listar regras
- `GET /api/v1/audit/rules/:id` - Buscar regra por ID
- `PUT /api/v1/audit/rules/:id` - Atualizar regra
- `POST /api/v1/audit/rules/:id/execute` - Executar regra

## 🔐 Autorização por Role

### Admin
- **Acesso total** a todas as funcionalidades
- **Gerenciamento** de regras de auditoria
- **Configuração** do sistema

### Director
- **Visualização** de todos os relatórios
- **Aprovação** de relatórios de compliance
- **Escalação** de pendências críticas

### Auditor
- **Gerenciamento** de pendências de validação
- **Criação** de relatórios de compliance
- **Configuração** de regras de auditoria
- **Análise** de logs de auditoria

### Analyst
- **Visualização** de pendências atribuídas
- **Atualização** de status de pendências
- **Comentários** em pendências
- **Consulta** de logs de auditoria

### Doctor
- **Visualização** de logs relacionados aos seus pacientes
- **Comentários** em pendências de seus casos
- **Consulta** de relatórios relevantes

## 🎯 Recursos Avançados

### Motor de Regras Inteligente
- **Avaliação** de condições complexas
- **Operadores lógicos** (AND, OR)
- **Ações automáticas** configuráveis
- **Execução** em tempo real
- **Estatísticas** de performance

### Sistema de Risco Automático
- **Cálculo** baseado em múltiplos fatores
- **Score** de 0-100 automático
- **Categorização** por nível de risco
- **Escalação** automática para riscos altos

### Workflow de Aprovação
- **Transições** de status validadas
- **Hierarquia** de aprovação
- **Notificações** automáticas
- **Prazos** e escalação

### Relatórios Inteligentes
- **Geração** automática de achados
- **Recomendações** baseadas em dados
- **Métricas** de compliance calculadas
- **Análise** de tendências

## 🔧 Configuração

### Variáveis de Ambiente
```env
# Server
PORT=3004
NODE_ENV=production

# Azure Database for PostgreSQL
POSTGRES_HOST=lazarus-postgres.postgres.database.azure.com
POSTGRES_PORT=5432
POSTGRES_DB=lazarus_audit
POSTGRES_USER=lazarus_admin
POSTGRES_PASSWORD=your_password

# Azure Cosmos DB (MongoDB API)
COSMOS_CONNECTION_STRING=mongodb://lazarus-cosmos:key@lazarus-cosmos.mongo.cosmos.azure.com:10255/lazarus_audit_read?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@lazarus-cosmos@

# Azure Cache for Redis
REDIS_HOST=lazarus-cache.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=your_redis_password

# Azure Service Bus
SERVICE_BUS_CONNECTION_STRING=Endpoint=sb://lazarus-servicebus.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=your_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Azure Application Insights
APPINSIGHTS_INSTRUMENTATIONKEY=your_instrumentation_key
```

## 🚀 Como Executar

### Desenvolvimento Local
```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Executar migrations
npx prisma migrate dev

# Executar em modo desenvolvimento
npm run dev
```

### Produção (Azure)
```bash
# Build da aplicação
npm run build

# Executar migrations
npx prisma migrate deploy

# Executar em produção
npm start
```

### Docker
```bash
# Build da imagem
docker build -t ms-audit .

# Executar container
docker run -p 3004:3004 --env-file .env ms-audit
```

## 📊 Monitoramento

### Health Checks
- `GET /health` - Status geral do serviço
- `GET /health/detailed` - Status detalhado com dependências

### Métricas
- **Application Insights** para métricas de performance
- **Logs estruturados** com Winston
- **Alertas** automáticos para falhas

### Dashboards
- **Azure Monitor** para infraestrutura
- **Application Insights** para aplicação
- **Grafana** para métricas customizadas

## 🔄 Integração com Outros Microsserviços

### MS Patients
- **Logs** de alterações em pacientes
- **Pendências** de validação de dados
- **Compliance** de informações médicas

### MS Procedures
- **Auditoria** de procedimentos cirúrgicos
- **Validação** de portes e materiais
- **Compliance** de protocolos médicos

### MS Billing
- **Auditoria** de faturamento
- **Validação** de cobranças
- **Compliance** financeiro

### MS Rules Engine
- **Execução** de regras de negócio
- **Validação** automática
- **Workflow** de aprovação

## 📈 Roadmap

### Fase 1 (Atual)
- ✅ CRUD completo de todas as entidades
- ✅ Motor de regras básico
- ✅ Relatórios de compliance
- ✅ Sistema de pendências

### Fase 2 (Próxima)
- 🔄 Integração com MCP para IA
- 🔄 Machine Learning para detecção de anomalias
- 🔄 Dashboards em tempo real
- 🔄 Alertas inteligentes

### Fase 3 (Futuro)
- 📋 Análise preditiva de riscos
- 📋 Automação completa de workflows
- 📋 Integração com sistemas externos
- 📋 Compliance automático com regulamentações

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte técnico, entre em contato:
- **Email**: dev@lazarus.com
- **Slack**: #lazarus-audit
- **Documentação**: http://localhost:3004/api-docs

