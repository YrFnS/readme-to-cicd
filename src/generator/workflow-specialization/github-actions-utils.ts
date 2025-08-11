/**
 * Utility functions for safely generating GitHub Actions expressions
 */

/**
 * Safely create a GitHub Actions expression
 */
export function ghExpr(expression: string): string {
  return `\${{ ${expression} }}`;
}

/**
 * Create a multi-line script with GitHub Actions expressions
 */
export function ghScript(lines: string[]): string {
  return lines.join('\n');
}

/**
 * Create environment-specific variable reference
 */
export function ghEnvVar(varName: string, environment?: string): string {
  if (environment) {
    return ghExpr(`vars.${varName}_${environment.toUpperCase()}`);
  }
  return ghExpr(`vars.${varName}`);
}

/**
 * Create environment-specific secret reference
 */
export function ghSecret(secretName: string, environment?: string): string {
  if (environment) {
    return ghExpr(`secrets.${secretName}_${environment.toUpperCase()}`);
  }
  return ghExpr(`secrets.${secretName}`);
}

/**
 * Create a conditional expression
 */
export function ghIf(condition: string): string {
  return condition;
}

/**
 * Create a needs reference
 */
export function ghNeeds(jobName: string, output: string): string {
  return ghExpr(`needs.${jobName}.outputs.${output}`);
}

/**
 * Create common GitHub context references
 */
export const ghContext = {
  sha: ghExpr('github.sha'),
  ref: ghExpr('github.ref'),
  repository: ghExpr('github.repository'),
  actor: ghExpr('github.actor'),
  token: ghExpr('secrets.GITHUB_TOKEN'),
  runId: ghExpr('github.run_id'),
  runNumber: ghExpr('github.run_number'),
  eventName: ghExpr('github.event_name')
};

/**
 * Create matrix references
 */
export function ghMatrix(key: string): string {
  return ghExpr(`matrix.${key}`);
}

/**
 * Create step output reference
 */
export function ghStepOutput(stepId: string, output: string): string {
  return ghExpr(`steps.${stepId}.outputs.${output}`);
}

/**
 * Create runner context references
 */
export const ghRunner = {
  os: ghExpr('runner.os'),
  arch: ghExpr('runner.arch'),
  temp: ghExpr('runner.temp'),
  workspace: ghExpr('runner.workspace')
};

/**
 * Helper to create deployment commands with proper escaping
 */
export function createDeploymentCommand(
  command: string,
  substitutions: Record<string, string> = {}
): string {
  let result = command;
  
  // Replace placeholders with GitHub Actions expressions
  Object.entries(substitutions).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  });
  
  return result;
}

/**
 * Create a multi-line deployment script
 */
export function createDeploymentScript(
  lines: string[],
  substitutions: Record<string, string> = {}
): string {
  return lines
    .map(line => createDeploymentCommand(line, substitutions))
    .join('\n');
}