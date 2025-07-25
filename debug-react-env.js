const content = `
# React Dashboard

> A modern dashboard application built with React, TypeScript, and Material-UI.

## Getting Started

The project structure follows standard React conventions:

- \`src/components/\` - Reusable UI components
- \`src/pages/\` - Page components
- \`src/hooks/\` - Custom React hooks
- \`public/\` - Static assets

## Configuration

Set these environment variables:

- \`REACT_APP_API_URL\` - Backend API URL
- \`REACT_APP_ENV\` - Environment (development/production)
`;

const commonEnvVars = [
  'NODE_ENV', 'PORT', 'HOST', 'DATABASE_URL', 'API_KEY', 'SECRET_KEY',
  'JWT_SECRET', 'REDIS_URL', 'MONGODB_URI', 'POSTGRES_URL', 'MYSQL_URL',
  'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GITHUB_TOKEN',
  'DEBUG', 'LOG_LEVEL', 'ENVIRONMENT', 'APP_ENV', 'CONFIG_PATH',
  'REACT_APP_API_URL', 'REACT_APP_ENV', 'REACT_APP_BASE_URL',
  'VITE_API_URL', 'VITE_APP_ENV', 'NEXT_PUBLIC_API_URL'
];

// Look for common environment variables in text (only in specific contexts)
for (const envVar of commonEnvVars) {
  // Only look for env vars in specific contexts (not random text)
  const contextPatterns = [
    new RegExp(`(?:environment|env|config|setting|variable).*\\b${envVar}\\b`, 'gi'),
    new RegExp(`\\b${envVar}\\b.*(?:environment|env|config|setting|variable)`, 'gi'),
    new RegExp(`set.*\\b${envVar}\\b`, 'gi'),
    new RegExp(`export.*\\b${envVar}\\b`, 'gi'),
    new RegExp(`\\$\\{?${envVar}\\}?`, 'gi'),
    new RegExp(`process\\.env\\.${envVar}`, 'gi'),
  ];
  
  let foundInContext = false;
  let contextText = '';
  
  for (const pattern of contextPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      foundInContext = true;
      contextText = matches[0];
      console.log(`Found ${envVar} in context: "${contextText}"`);
      break;
    }
  }
  
  if (!foundInContext && envVar.startsWith('REACT_APP_')) {
    console.log(`${envVar} not found in context patterns`);
  }
}