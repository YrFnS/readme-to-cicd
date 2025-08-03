/**
 * Generic CI/CD templates for fallback scenarios
 */

export interface GenericTemplate {
  name: string;
  framework: string;
  ecosystem: string;
  template: {
    setup: string[];
    build: string[];
    test: string[];
  };
}

/**
 * Generic templates for common frameworks
 */
export const genericTemplates: GenericTemplate[] = [
  {
    name: 'nodejs-generic',
    framework: 'nodejs',
    ecosystem: 'nodejs',
    template: {
      setup: ['npm install'],
      build: ['npm run build'],
      test: ['npm test']
    }
  },
  {
    name: 'python-generic',
    framework: 'python',
    ecosystem: 'python',
    template: {
      setup: ['pip install -r requirements.txt'],
      build: ['python setup.py build'],
      test: ['python -m pytest']
    }
  },
  {
    name: 'rust-generic',
    framework: 'rust',
    ecosystem: 'rust',
    template: {
      setup: ['cargo fetch'],
      build: ['cargo build'],
      test: ['cargo test']
    }
  }
];

export default genericTemplates;