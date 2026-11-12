import * as Joi from "joi";

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().required(),
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  REDIS_HOST: Joi.string().default("127.0.0.1"),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow("").default(""),
  RATE_LIMIT_TTL_MS: Joi.number().integer().min(1000).default(60000),
  RATE_LIMIT_LIMIT: Joi.number().integer().min(1).default(60),
});
