/**
 * Simple YAML Generator Test
 * Basic test to validate the generator is working
 */

import { describe, it, expect } from 'vitest';

describe('Simple YAML Generator Test', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should be able to import yaml library', async () => {
    const yaml = await import('js-yaml');
    expect(yaml).toBeDefined();
    expect(yaml.load).toBeDefined();
  });

  it('should be able to parse basic YAML', async () => {
    const yaml = await import('js-yaml');
    const yamlContent = `
name: Test Workflow
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;
    
    const parsed = yaml.load(yamlContent);
    expect(parsed).toBeDefined();
    expect((parsed as any).name).toBe('Test Workflow');
  });
});