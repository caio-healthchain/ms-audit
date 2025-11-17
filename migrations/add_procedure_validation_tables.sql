-- Script SQL para adicionar tabelas de validação de procedimentos
-- Executar manualmente no banco de dados

-- Tabela de Portes Cirúrgicos (se não existir)
CREATE TABLE IF NOT EXISTS "tbdomPorte" (
  "codigoTUSS" VARCHAR(10) PRIMARY KEY,
  "porte" VARCHAR(10) NOT NULL
);

CREATE INDEX IF NOT EXISTS "tbdomPorte_codigo_idx" ON "tbdomPorte"("codigoTUSS");
CREATE INDEX IF NOT EXISTS "tbdomPorte_porte_idx" ON "tbdomPorte"("porte");

-- Tabela de Contratos (se não existir)
CREATE TABLE IF NOT EXISTS "contrato" (
  "id" SERIAL PRIMARY KEY,
  "numero" VARCHAR(255) UNIQUE NOT NULL,
  "operadoraId" VARCHAR(255) NOT NULL,
  "status" VARCHAR(50) NOT NULL,
  "dataInicio" TIMESTAMP NOT NULL,
  "dataFim" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "contrato_operadoraId_idx" ON "contrato"("operadoraId");
CREATE INDEX IF NOT EXISTS "contrato_status_idx" ON "contrato"("status");
CREATE INDEX IF NOT EXISTS "contrato_numero_idx" ON "contrato"("numero");
CREATE INDEX IF NOT EXISTS "contrato_dataInicio_idx" ON "contrato"("dataInicio");
CREATE INDEX IF NOT EXISTS "contrato_dataFim_idx" ON "contrato"("dataFim");

-- Tabela de Itens do Contrato (se não existir)
CREATE TABLE IF NOT EXISTS "contrato_itens" (
  "id" SERIAL PRIMARY KEY,
  "contratoId" INTEGER NOT NULL,
  "codigoTUSS" VARCHAR(10) NOT NULL,
  "valorContratado" DECIMAL(10, 2) NOT NULL,
  "estaNoPacote" BOOLEAN DEFAULT FALSE,
  "requerAutorizacao" BOOLEAN DEFAULT FALSE,
  "observacoes" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "contrato_itens_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contrato"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "contrato_itens_contratoId_idx" ON "contrato_itens"("contratoId");
CREATE INDEX IF NOT EXISTS "contrato_itens_codigoTUSS_idx" ON "contrato_itens"("codigoTUSS");
CREATE UNIQUE INDEX IF NOT EXISTS "contrato_itens_contratoId_codigoTUSS_idx" ON "contrato_itens"("contratoId", "codigoTUSS");

-- Criar tipos ENUM para validações
DO $$ BEGIN
  CREATE TYPE "TipoValidacao" AS ENUM ('VALOR', 'PORTE', 'PACOTE', 'DUT', 'MATERIAL', 'DUPLICADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "StatusValidacao" AS ENUM ('PENDENTE', 'CONFORME', 'DIVERGENTE', 'NAO_ENCONTRADO', 'ERRO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "StatusProcedimento" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'EM_ANALISE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela de Validações de Auditoria
CREATE TABLE IF NOT EXISTS "auditoria_validacoes" (
  "id" VARCHAR(255) PRIMARY KEY,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "guiaId" INTEGER NOT NULL,
  "procedimentoId" INTEGER NOT NULL,
  "tipoValidacao" "TipoValidacao" NOT NULL,
  "status" "StatusValidacao" NOT NULL,
  "mensagem" TEXT,
  "valorEsperado" DECIMAL(10, 2),
  "valorEncontrado" DECIMAL(10, 2),
  "diferenca" DECIMAL(10, 2),
  "porteEsperado" VARCHAR(10),
  "porteEncontrado" VARCHAR(10),
  "metadata" JSONB,
  "auditorId" VARCHAR(255),
  "dataValidacao" TIMESTAMP,
  "observacoes" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "auditoria_validacoes_unique_idx" ON "auditoria_validacoes"("guiaId", "procedimentoId", "tipoValidacao");
CREATE INDEX IF NOT EXISTS "auditoria_validacoes_guiaId_idx" ON "auditoria_validacoes"("guiaId");
CREATE INDEX IF NOT EXISTS "auditoria_validacoes_procedimentoId_idx" ON "auditoria_validacoes"("procedimentoId");
CREATE INDEX IF NOT EXISTS "auditoria_validacoes_status_idx" ON "auditoria_validacoes"("status");
CREATE INDEX IF NOT EXISTS "auditoria_validacoes_tipoValidacao_idx" ON "auditoria_validacoes"("tipoValidacao");

-- Tabela de Status de Procedimentos
CREATE TABLE IF NOT EXISTS "procedimento_status" (
  "id" SERIAL PRIMARY KEY,
  "guiaId" INTEGER NOT NULL,
  "procedimentoId" INTEGER NOT NULL,
  "status" "StatusProcedimento" NOT NULL,
  "auditorId" VARCHAR(255),
  "observacoes" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "procedimento_status_unique_idx" ON "procedimento_status"("guiaId", "procedimentoId");
CREATE INDEX IF NOT EXISTS "procedimento_status_guiaId_idx" ON "procedimento_status"("guiaId");
CREATE INDEX IF NOT EXISTS "procedimento_status_status_idx" ON "procedimento_status"("status");

-- Inserir alguns dados de exemplo de portes (se não existirem)
INSERT INTO "tbdomPorte" ("codigoTUSS", "porte") VALUES
  ('30906113', '3B'),
  ('30913101', '2C'),
  ('10102019', '1'),
  ('20203047', '2A')
ON CONFLICT ("codigoTUSS") DO NOTHING;

-- Comentários sobre as tabelas
COMMENT ON TABLE "tbdomPorte" IS 'Tabela de portes cirúrgicos por código TUSS';
COMMENT ON TABLE "contrato" IS 'Tabela de contratos com operadoras';
COMMENT ON TABLE "contrato_itens" IS 'Itens (procedimentos) incluídos nos contratos';
COMMENT ON TABLE "auditoria_validacoes" IS 'Registro de validações realizadas em procedimentos';
COMMENT ON TABLE "procedimento_status" IS 'Status de aprovação/rejeição de procedimentos';
