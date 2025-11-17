import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import { config } from './config';
import { logger } from './logger';

// PostgreSQL (Write Database) - Azure Database for PostgreSQL
export const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: config.postgres.connectionString || 
           `postgresql://${config.postgres.username}:${config.postgres.password}@${config.postgres.host}:${config.postgres.port}/${config.postgres.database}?sslmode=${config.postgres.ssl ? 'require' : 'prefer'}`
    }
  }
});

// MongoDB/Cosmos DB (Read Database - CQRS)
export const connectMongoDB = async (): Promise<void> => {
  try {
    let connectionUri: string;
    let connectionOptions: any;

    if (config.features.useMongoDBAtlas && config.mongodb.uri) {
      // MongoDB Atlas (future migration)
      connectionUri = config.mongodb.uri;
      connectionOptions = config.mongodb.options;
      logger.info('Connecting to MongoDB Atlas...');
    } else {
      // Azure Cosmos DB (MVP1)
      connectionUri = config.cosmosdb.uri;
      connectionOptions = {
        ...config.cosmosdb.options,
        // Cosmos DB specific authentication
        ...(config.cosmosdb.key && {
          auth: {
            username: config.cosmosdb.uri.split('@')[0].split('//')[1].split(':')[0],
            password: config.cosmosdb.key
          }
        })
      };
      logger.info('Connecting to Azure Cosmos DB (MongoDB API)...');
    }

    await mongoose.connect(connectionUri, connectionOptions);
    
    // Configure Mongoose for Cosmos DB optimizations
    if (config.features.useCosmosDB) {
      // Disable some MongoDB features not supported by Cosmos DB
      mongoose.set('bufferCommands', false);
      // CORREÇÃO: Removida configuração inválida bufferMaxEntries
    }

    logger.info('MongoDB/Cosmos DB connected successfully');
  } catch (error: unknown) {
    logger.error('MongoDB/Cosmos DB connection failed:', error);
    throw error;
  }
};

// Redis (Cache) - Azure Redis Cache
export const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
    ...(config.redis.tls && { tls: true })
  },
  password: config.redis.password,
  database: config.redis.db,
  // Use connection string if provided (Azure Redis format)
  ...(config.redis.connectionString && {
    url: config.redis.connectionString
  })
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis connected successfully');
});

redisClient.on('ready', () => {
  logger.info('Redis ready for operations');
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (error: unknown) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
};

// Connect all databases
export const connectDatabases = async (): Promise<void> => {
  try {
    // Test PostgreSQL connection
    await prisma.$connect();
    logger.info('PostgreSQL (Write DB) connected successfully');

    // Connect to MongoDB/Cosmos DB (optional)
    if (config.features.useCosmosDB || config.features.useMongoDBAtlas) {
      await connectMongoDB();
    } else {
      logger.info('MongoDB/Cosmos DB connection skipped (disabled in config)');
    }

    // Connect to Redis (optional)
    //await connectRedis();

    logger.info('All databases connected successfully');
  } catch (error: unknown) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

// Health check function
export const checkDatabaseHealth = async (): Promise<{
  postgres: 'connected' | 'disconnected';
  mongodb: 'connected' | 'disconnected';
  redis: 'connected' | 'disconnected';
}> => {
  // CORREÇÃO: Usar tipo union explícito para permitir mudança de valor
  const health: {
    postgres: 'connected' | 'disconnected';
    mongodb: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
  } = {
    postgres: 'disconnected',
    mongodb: 'disconnected',
    redis: 'disconnected',
  };

  try {
    // Check PostgreSQL
    await prisma.$queryRaw`SELECT 1`;
    health.postgres = 'connected';
  } catch (error: unknown) {
    logger.error('PostgreSQL health check failed:', error);
  }

  try {
    // Check MongoDB/Cosmos DB
    // CORREÇÃO: Adicionada verificação de null safety
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      health.mongodb = 'connected';
    }
  } catch (error: unknown) {
    logger.error('MongoDB health check failed:', error);
  }

  try {
    // Check Redis
    await redisClient.ping();
    health.redis = 'connected';
  } catch (error: unknown) {
    logger.error('Redis health check failed:', error);
  }

  return health;
};

// Graceful shutdown
export const disconnectDatabases = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    await mongoose.disconnect();
    await redisClient.disconnect();
    logger.info('All databases disconnected successfully');
  } catch (error: unknown) {
    logger.error('Error disconnecting databases:', error);
  }
};

// Export types for use in other modules
export type DatabaseHealth = Awaited<ReturnType<typeof checkDatabaseHealth>>;
