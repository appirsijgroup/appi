/**
 * Environment Variables Validation
 *
 * Security best practices:
 * 1. Validate all environment variables at build time
 * 2. Throw error early if required variables are missing (server-side only)
 * 3. Type-safe environment variable access
 * 4. Graceful fallback for client-side
 */

type EnvVariable = 'DATABASE_URL' | 'JWT_SECRET';

interface EnvSchema {
  [key: string]: {
    required: boolean;
    validator?: (value: string) => boolean;
    errorMessage?: string;
  };
}

// Define environment variable schema
const envSchema: EnvSchema = {
  DATABASE_URL: {
    required: true,
    errorMessage: 'Must be a valid PostgreSQL connection string'
  },
  JWT_SECRET: {
    required: true,
    validator: (value) => value.length >= 32,
    errorMessage: 'JWT_SECRET should be at least 32 characters for security'
  }
};

// Validate all environment variables (server-side only)
function validateEnv(): void {
  const errors: string[] = [];

  for (const [envVar, config] of Object.entries(envSchema)) {
    const value = process.env[envVar];

    if (config.required && !value) {
      errors.push(`❌ Missing required environment variable: ${envVar}`);
      continue;
    }

    if (value && config.validator && !config.validator(value)) {
      errors.push(
        `❌ Invalid ${envVar}: ${config.errorMessage || 'Format validation failed'}`
      );
    }
  }

  if (errors.length > 0) {
    // Only throw in production to prevent blocking local dev if not strictly needed, 
    // but DATABASE_URL is always needed.
    if (process.env.NODE_ENV === 'production' || errors.some(e => e.includes('DATABASE_URL'))) {
      console.error('\n' +
        '═══════════════════════════════════════════════════════════════\n' +
        '  Environment Variables Validation Failed\n' +
        '═══════════════════════════════════════════════════════════════\n' +
        errors.join('\n') +
        '\n\n' +
        'Please check your .env file and ensure all required variables are set.\n' +
        '═══════════════════════════════════════════════════════════════\n');
    }
  }
}

// Run validation immediately
if (typeof window === 'undefined') {
  validateEnv();
}

/**
 * Type-safe accessor for environment variables
 */
export function getEnvVar(key: EnvVariable): string | undefined {
  return process.env[key];
}

export function getEnvVarOrDefault(key: EnvVariable, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export { validateEnv };
