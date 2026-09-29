export type SeedCredentials = { adminPassword: string; demoPassword: string };

export function requireSeedCredentials(env: NodeJS.ProcessEnv): SeedCredentials {
  const adminPassword = env.SEED_ADMIN_PASSWORD;
  const demoPassword = env.SEED_DEMO_PASSWORD;
  if (!adminPassword || adminPassword.length < 24) {
    throw new Error('Set SEED_ADMIN_PASSWORD in server/.env to a unique value with at least 24 characters.');
  }
  if (!demoPassword || demoPassword.length < 24) {
    throw new Error('Set SEED_DEMO_PASSWORD in server/.env to a unique value with at least 24 characters.');
  }
  if (adminPassword === demoPassword) {
    throw new Error('SEED_ADMIN_PASSWORD and SEED_DEMO_PASSWORD must be different.');
  }
  return { adminPassword, demoPassword };
}
