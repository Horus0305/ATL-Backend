export const validateEnv = () => {
  const requiredEnvVars = [
    'DATABASE_URL',
    'SECRET_KEY'
  ];

  // Optional environment variables
  const optionalEnvVars = [
    'SENDGRID_API_KEY',
    'NOTIFICATION_API',
    'API_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }

  // Log warning for missing optional variables
  const missingOptionalVars = optionalEnvVars.filter(envVar => !process.env[envVar]);
  if (missingOptionalVars.length > 0) {
    console.warn(
      `Warning: Missing optional environment variables: ${missingOptionalVars.join(', ')}`
    );
  }
}; 