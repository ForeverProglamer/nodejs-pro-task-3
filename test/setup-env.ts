process.env.NODE_ENV = process.env.NODE_ENV ?? "test";

process.env.JWT_AT_SECRET = process.env.JWT_AT_SECRET ?? "at-secret";
process.env.JWT_AT_MAX_AGE_S = process.env.JWT_AT_MAX_AGE_S ?? "3600";

process.env.JWT_RT_SECRET = process.env.JWT_RT_SECRET ?? "rt-secret";
process.env.JWT_RT_MAX_AGE_S = process.env.JWT_RT_MAX_AGE_S ?? "604800";

process.env.WORKER_ENABLE = process.env.WORKER_ENABLE ?? "true";
