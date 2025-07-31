import { CITemplate, CIStepTemplate, EnvironmentVariable } from '../interfaces/detection-rules';

/**
 * Template management and variable substitution
 */
export class TemplateManager {
  /**
   * Render template with variable substitution
   */
  renderTemplate(template: CITemplate, variables: Record<string, string>): CITemplate {
    return {
      setup: template.setup.map(step => this.renderStepTemplate(step, variables)),
      build: template.build.map(step => this.renderStepTemplate(step, variables)),
      test: template.test.map(step => this.renderStepTemplate(step, variables)),
      deploy: template.deploy?.map(step => this.renderStepTemplate(step, variables)) || [],
      ...(template.environment && { environment: template.environment.map(env => this.renderEnvironmentVariable(env, variables)) }),
      metadata: template.metadata
    };
  }

  /**
   * Render individual step template
   */
  private renderStepTemplate(stepTemplate: CIStepTemplate, variables: Record<string, string>): CIStepTemplate {
    return {
      ...stepTemplate,
      name: this.substituteVariables(stepTemplate.name, variables),
      ...(stepTemplate.command && { command: this.substituteVariables(stepTemplate.command, variables) }),
      ...(stepTemplate.with && { with: this.substituteObjectVariables(stepTemplate.with, variables) }),
      ...(stepTemplate.env && { env: this.substituteObjectVariables(stepTemplate.env, variables) })
    };
  }

  /**
   * Render environment variable
   */
  private renderEnvironmentVariable(envVar: EnvironmentVariable, variables: Record<string, string>): EnvironmentVariable {
    return {
      ...envVar,
      value: this.substituteVariables(envVar.value, variables)
    };
  }

  /**
   * Substitute variables in a string
   */
  private substituteVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(pattern, value);
    });
    
    return result;
  }

  /**
   * Substitute variables in an object
   */
  private substituteObjectVariables(obj: Record<string, string>, variables: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    
    Object.entries(obj).forEach(([key, value]) => {
      result[key] = this.substituteVariables(value, variables);
    });
    
    return result;
  }

  /**
   * Extract variables from template
   */
  extractTemplateVariables(template: CITemplate): string[] {
    const variables = new Set<string>();
    
    // Extract from all step templates
    [...template.setup, ...template.build, ...template.test, ...(template.deploy || [])].forEach(step => {
      this.extractVariablesFromString(step.name).forEach(v => variables.add(v));
      if (step.command) {
        this.extractVariablesFromString(step.command).forEach(v => variables.add(v));
      }
      if (step.with) {
        Object.values(step.with).forEach(value => {
          this.extractVariablesFromString(value).forEach(v => variables.add(v));
        });
      }
    });
    
    // Extract from environment variables
    template.environment?.forEach(env => {
      this.extractVariablesFromString(env.value).forEach(v => variables.add(v));
    });
    
    return Array.from(variables);
  }

  /**
   * Extract variable names from a template string
   */
  private extractVariablesFromString(template: string): string[] {
    const matches = template.match(/{{\s*([^}]+)\s*}}/g);
    if (!matches) return [];
    
    return matches.map(match => {
      const variable = match.replace(/{{\s*|\s*}}/g, '');
      return variable.trim();
    });
  }

  /**
   * Validate template variables
   */
  validateTemplate(template: CITemplate, providedVariables: Record<string, string>): {
    isValid: boolean;
    missingVariables: string[];
    unusedVariables: string[];
  } {
    const requiredVariables = this.extractTemplateVariables(template);
    const providedVariableNames = Object.keys(providedVariables);
    
    const missingVariables = requiredVariables.filter(v => !providedVariableNames.includes(v));
    const unusedVariables = providedVariableNames.filter(v => !requiredVariables.includes(v));
    
    return {
      isValid: missingVariables.length === 0,
      missingVariables,
      unusedVariables
    };
  }
}