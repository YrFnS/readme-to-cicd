import { CITemplate, CIStepTemplate } from '../interfaces/detection-rules';

/**
 * CI/CD template definitions for different frameworks
 */
export class CITemplateRegistry {
  private templates: Map<string, CITemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Get CI template for a framework
   */
  getTemplate(frameworkName: string): CITemplate | undefined {
    return this.templates.get(frameworkName.toLowerCase());
  }

  /**
   * Register a new CI template
   */
  registerTemplate(frameworkName: string, template: CITemplate): void {
    this.templates.set(frameworkName.toLowerCase(), template);
  }

  /**
   * Get all available template names
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Initialize default templates
   */
  private initializeTemplates(): void {
    // Node.js ecosystem templates
    this.initializeNodeJSTemplates();
    
    // Python ecosystem templates
    this.initializePythonTemplates();
    
    // Rust ecosystem templates
    this.initializeRustTemplates();
    
    // Go ecosystem templates
    this.initializeGoTemplates();
    
    // Java ecosystem templates
    this.initializeJavaTemplates();
    
    // Container templates
    this.initializeContainerTemplates();
    
    // Frontend tooling templates
    this.initializeFrontendTemplates();
  }

  /**
   * Initialize Node.js framework templates
   */
  private initializeNodeJSTemplates(): void {
    // Generic Node.js template
    this.registerTemplate('nodejs', {
      setup: [
        {
          id: 'setup-node',
          name: 'Setup Node.js',
          uses: 'actions/setup-node@v4',
          with: {
            'node-version': '{{ nodeVersion }}',
            'cache': '{{ packageManager }}'
          },
          variables: ['nodeVersion', 'packageManager']
        }
      ],
      build: [
        {
          id: 'install-deps',
          name: 'Install dependencies',
          command: '{{ packageManager }} install',
          variables: ['packageManager']
        },
        {
          id: 'build-project',
          name: 'Build project',
          command: '{{ packageManager }} run build',
          condition: '{{ hasBuildScript }}',
          variables: ['packageManager', 'hasBuildScript']
        }
      ],
      test: [
        {
          id: 'run-tests',
          name: 'Run tests',
          command: '{{ packageManager }} test',
          condition: '{{ hasTestScript }}',
          variables: ['packageManager', 'hasTestScript']
        },
        {
          id: 'run-lint',
          name: 'Run linting',
          command: '{{ packageManager }} run lint',
          condition: '{{ hasLintScript }}',
          variables: ['packageManager', 'hasLintScript']
        }
      ],
      environment: [
        {
          name: 'NODE_ENV',
          value: 'test',
          required: false,
          description: 'Node.js environment'
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'Generic Node.js CI/CD template',
        requiredSecrets: [],
        estimatedDuration: 5
      }
    });

    // React template
    this.registerTemplate('react', {
      setup: [
        {
          id: 'setup-node',
          name: 'Setup Node.js',
          uses: 'actions/setup-node@v4',
          with: {
            'node-version': '{{ nodeVersion }}',
            'cache': '{{ packageManager }}'
          },
          variables: ['nodeVersion', 'packageManager']
        }
      ],
      build: [
        {
          id: 'install-deps',
          name: 'Install dependencies',
          command: '{{ packageManager }} install',
          variables: ['packageManager']
        },
        {
          id: 'build-react',
          name: 'Build React application',
          command: '{{ packageManager }} run build',
          variables: ['packageManager']
        }
      ],
      test: [
        {
          id: 'run-tests',
          name: 'Run React tests',
          command: '{{ packageManager }} test -- --coverage --watchAll=false',
          variables: ['packageManager']
        },
        {
          id: 'run-lint',
          name: 'Run ESLint',
          command: '{{ packageManager }} run lint',
          condition: '{{ hasLintScript }}',
          variables: ['packageManager', 'hasLintScript']
        }
      ],
      deploy: [
        {
          id: 'deploy-static',
          name: 'Deploy to static hosting',
          command: 'echo "Deploy build/ directory to your static hosting provider"',
          condition: '{{ isStaticSite }}',
          variables: ['isStaticSite']
        }
      ],
      environment: [
        {
          name: 'CI',
          value: 'true',
          required: true,
          description: 'Enables CI mode for React scripts'
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'React application CI/CD template',
        requiredSecrets: [],
        estimatedDuration: 8
      }
    });

    // Next.js template
    this.registerTemplate('next.js', {
      setup: [
        {
          id: 'setup-node',
          name: 'Setup Node.js',
          uses: 'actions/setup-node@v4',
          with: {
            'node-version': '{{ nodeVersion }}',
            'cache': '{{ packageManager }}'
          },
          variables: ['nodeVersion', 'packageManager']
        }
      ],
      build: [
        {
          id: 'install-deps',
          name: 'Install dependencies',
          command: '{{ packageManager }} install',
          variables: ['packageManager']
        },
        {
          id: 'build-nextjs',
          name: 'Build Next.js application',
          command: '{{ packageManager }} run build',
          variables: ['packageManager']
        }
      ],
      test: [
        {
          id: 'run-tests',
          name: 'Run tests',
          command: '{{ packageManager }} test',
          condition: '{{ hasTestScript }}',
          variables: ['packageManager', 'hasTestScript']
        },
        {
          id: 'run-lint',
          name: 'Run Next.js lint',
          command: '{{ packageManager }} run lint',
          variables: ['packageManager']
        }
      ],
      deploy: [
        {
          id: 'deploy-vercel',
          name: 'Deploy to Vercel',
          uses: 'amondnet/vercel-action@v25',
          with: {
            'vercel-token': '${{ secrets.VERCEL_TOKEN }}',
            'vercel-org-id': '${{ secrets.VERCEL_ORG_ID }}',
            'vercel-project-id': '${{ secrets.VERCEL_PROJECT_ID }}'
          },
          condition: '{{ deployToVercel }}',
          variables: ['deployToVercel']
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'Next.js application CI/CD template',
        requiredSecrets: ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'],
        estimatedDuration: 10
      }
    });

    // Express template
    this.registerTemplate('express', {
      setup: [
        {
          id: 'setup-node',
          name: 'Setup Node.js',
          uses: 'actions/setup-node@v4',
          with: {
            'node-version': '{{ nodeVersion }}',
            'cache': '{{ packageManager }}'
          },
          variables: ['nodeVersion', 'packageManager']
        }
      ],
      build: [
        {
          id: 'install-deps',
          name: 'Install dependencies',
          command: '{{ packageManager }} install',
          variables: ['packageManager']
        },
        {
          id: 'build-express',
          name: 'Build Express application',
          command: '{{ packageManager }} run build',
          condition: '{{ hasBuildScript }}',
          variables: ['packageManager', 'hasBuildScript']
        }
      ],
      test: [
        {
          id: 'run-tests',
          name: 'Run Express tests',
          command: '{{ packageManager }} test',
          variables: ['packageManager']
        },
        {
          id: 'run-integration-tests',
          name: 'Run integration tests',
          command: '{{ packageManager }} run test:integration',
          condition: '{{ hasIntegrationTests }}',
          variables: ['packageManager', 'hasIntegrationTests']
        }
      ],
      environment: [
        {
          name: 'NODE_ENV',
          value: 'test',
          required: true,
          description: 'Express environment'
        },
        {
          name: 'PORT',
          value: '3000',
          required: false,
          description: 'Express server port'
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'Express.js API CI/CD template',
        requiredSecrets: [],
        estimatedDuration: 7
      }
    });
  } 
 /**
   * Initialize Python framework templates
   */
  private initializePythonTemplates(): void {
    // Generic Python template
    this.registerTemplate('python', {
      setup: [
        {
          id: 'setup-python',
          name: 'Setup Python',
          uses: 'actions/setup-python@v4',
          with: {
            'python-version': '{{ pythonVersion }}',
            'cache': 'pip'
          },
          variables: ['pythonVersion']
        }
      ],
      build: [
        {
          id: 'install-deps',
          name: 'Install dependencies',
          command: 'pip install -r requirements.txt',
          condition: '{{ hasRequirementsTxt }}',
          variables: ['hasRequirementsTxt']
        },
        {
          id: 'install-poetry-deps',
          name: 'Install Poetry dependencies',
          command: 'poetry install',
          condition: '{{ hasPoetry }}',
          variables: ['hasPoetry']
        }
      ],
      test: [
        {
          id: 'run-pytest',
          name: 'Run tests with pytest',
          command: 'pytest --cov={{ packageName }} --cov-report=xml',
          condition: '{{ hasPytest }}',
          variables: ['hasPytest', 'packageName']
        },
        {
          id: 'run-unittest',
          name: 'Run unittest',
          command: 'python -m unittest discover',
          condition: '{{ hasUnittest }}',
          variables: ['hasUnittest']
        }
      ],
      environment: [
        {
          name: 'PYTHONPATH',
          value: '.',
          required: false,
          description: 'Python module search path'
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'Generic Python CI/CD template',
        requiredSecrets: [],
        estimatedDuration: 6
      }
    });

    // Django template
    this.registerTemplate('django', {
      setup: [
        {
          id: 'setup-python',
          name: 'Setup Python',
          uses: 'actions/setup-python@v4',
          with: {
            'python-version': '{{ pythonVersion }}',
            'cache': 'pip'
          },
          variables: ['pythonVersion']
        }
      ],
      build: [
        {
          id: 'install-deps',
          name: 'Install dependencies',
          command: 'pip install -r requirements.txt',
          variables: []
        },
        {
          id: 'collect-static',
          name: 'Collect static files',
          command: 'python manage.py collectstatic --noinput',
          variables: []
        },
        {
          id: 'migrate-db',
          name: 'Run database migrations',
          command: 'python manage.py migrate',
          variables: []
        }
      ],
      test: [
        {
          id: 'run-django-tests',
          name: 'Run Django tests',
          command: 'python manage.py test',
          variables: []
        },
        {
          id: 'check-django',
          name: 'Run Django system checks',
          command: 'python manage.py check',
          variables: []
        }
      ],
      environment: [
        {
          name: 'DJANGO_SETTINGS_MODULE',
          value: '{{ settingsModule }}',
          required: true,
          description: 'Django settings module'
        },
        {
          name: 'SECRET_KEY',
          value: '${{ secrets.DJANGO_SECRET_KEY }}',
          required: true,
          description: 'Django secret key'
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'Django web framework CI/CD template',
        requiredSecrets: ['DJANGO_SECRET_KEY'],
        estimatedDuration: 10
      }
    });

    // FastAPI template
    this.registerTemplate('fastapi', {
      setup: [
        {
          id: 'setup-python',
          name: 'Setup Python',
          uses: 'actions/setup-python@v4',
          with: {
            'python-version': '{{ pythonVersion }}',
            'cache': 'pip'
          },
          variables: ['pythonVersion']
        }
      ],
      build: [
        {
          id: 'install-deps',
          name: 'Install dependencies',
          command: 'pip install -r requirements.txt',
          variables: []
        }
      ],
      test: [
        {
          id: 'run-fastapi-tests',
          name: 'Run FastAPI tests',
          command: 'pytest --cov={{ packageName }} --cov-report=xml',
          variables: ['packageName']
        },
        {
          id: 'test-api-endpoints',
          name: 'Test API endpoints',
          command: 'pytest tests/test_api.py -v',
          condition: '{{ hasApiTests }}',
          variables: ['hasApiTests']
        }
      ],
      environment: [
        {
          name: 'ENVIRONMENT',
          value: 'testing',
          required: false,
          description: 'FastAPI environment'
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'FastAPI framework CI/CD template',
        requiredSecrets: [],
        estimatedDuration: 8
      }
    });
  }

  /**
   * Initialize Rust framework templates
   */
  private initializeRustTemplates(): void {
    this.registerTemplate('rust', {
      setup: [
        {
          id: 'setup-rust',
          name: 'Setup Rust',
          uses: 'actions-rs/toolchain@v1',
          with: {
            'toolchain': '{{ rustVersion }}',
            'override': 'true',
            'components': 'rustfmt, clippy'
          },
          variables: ['rustVersion']
        }
      ],
      build: [
        {
          id: 'cargo-build',
          name: 'Build with Cargo',
          command: 'cargo build --verbose',
          variables: []
        },
        {
          id: 'cargo-build-release',
          name: 'Build release',
          command: 'cargo build --release',
          condition: '{{ buildRelease }}',
          variables: ['buildRelease']
        }
      ],
      test: [
        {
          id: 'cargo-test',
          name: 'Run Cargo tests',
          command: 'cargo test --verbose',
          variables: []
        },
        {
          id: 'cargo-clippy',
          name: 'Run Clippy',
          command: 'cargo clippy -- -D warnings',
          variables: []
        },
        {
          id: 'cargo-fmt',
          name: 'Check formatting',
          command: 'cargo fmt -- --check',
          variables: []
        }
      ],
      environment: [
        {
          name: 'CARGO_TERM_COLOR',
          value: 'always',
          required: false,
          description: 'Enable colored Cargo output'
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'Rust CI/CD template',
        requiredSecrets: [],
        estimatedDuration: 12
      }
    });
  }

  /**
   * Initialize Go framework templates
   */
  private initializeGoTemplates(): void {
    this.registerTemplate('go', {
      setup: [
        {
          id: 'setup-go',
          name: 'Setup Go',
          uses: 'actions/setup-go@v4',
          with: {
            'go-version': '{{ goVersion }}',
            'cache': 'true'
          },
          variables: ['goVersion']
        }
      ],
      build: [
        {
          id: 'go-build',
          name: 'Build Go application',
          command: 'go build -v ./...',
          variables: []
        }
      ],
      test: [
        {
          id: 'go-test',
          name: 'Run Go tests',
          command: 'go test -v -race -coverprofile=coverage.out ./...',
          variables: []
        },
        {
          id: 'go-vet',
          name: 'Run go vet',
          command: 'go vet ./...',
          variables: []
        }
      ],
      environment: [
        {
          name: 'CGO_ENABLED',
          value: '0',
          required: false,
          description: 'Disable CGO for static builds'
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'Go CI/CD template',
        requiredSecrets: [],
        estimatedDuration: 8
      }
    });
  }

  /**
   * Initialize Java framework templates
   */
  private initializeJavaTemplates(): void {
    // Maven template
    this.registerTemplate('maven', {
      setup: [
        {
          id: 'setup-java',
          name: 'Setup Java',
          uses: 'actions/setup-java@v3',
          with: {
            'java-version': '{{ javaVersion }}',
            'distribution': 'temurin',
            'cache': 'maven'
          },
          variables: ['javaVersion']
        }
      ],
      build: [
        {
          id: 'maven-compile',
          name: 'Compile with Maven',
          command: 'mvn clean compile',
          variables: []
        },
        {
          id: 'maven-package',
          name: 'Package with Maven',
          command: 'mvn package -DskipTests',
          variables: []
        }
      ],
      test: [
        {
          id: 'maven-test',
          name: 'Run Maven tests',
          command: 'mvn test',
          variables: []
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'Maven build tool CI/CD template',
        requiredSecrets: [],
        estimatedDuration: 10
      }
    });

    // Gradle template
    this.registerTemplate('gradle', {
      setup: [
        {
          id: 'setup-java',
          name: 'Setup Java',
          uses: 'actions/setup-java@v3',
          with: {
            'java-version': '{{ javaVersion }}',
            'distribution': 'temurin',
            'cache': 'gradle'
          },
          variables: ['javaVersion']
        }
      ],
      build: [
        {
          id: 'gradle-build',
          name: 'Build with Gradle',
          command: './gradlew build -x test',
          variables: []
        }
      ],
      test: [
        {
          id: 'gradle-test',
          name: 'Run Gradle tests',
          command: './gradlew test',
          variables: []
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'Gradle build tool CI/CD template',
        requiredSecrets: [],
        estimatedDuration: 12
      }
    });
  }

  /**
   * Initialize container templates
   */
  private initializeContainerTemplates(): void {
    this.registerTemplate('docker', {
      setup: [
        {
          id: 'setup-docker',
          name: 'Setup Docker Buildx',
          uses: 'docker/setup-buildx-action@v3',
          variables: []
        }
      ],
      build: [
        {
          id: 'docker-build',
          name: 'Build Docker image',
          command: 'docker build -t {{ imageName }}:{{ imageTag }} .',
          variables: ['imageName', 'imageTag']
        }
      ],
      test: [
        {
          id: 'docker-test',
          name: 'Test Docker image',
          command: 'docker run --rm {{ imageName }}:{{ imageTag }} {{ testCommand }}',
          condition: '{{ hasTestCommand }}',
          variables: ['imageName', 'imageTag', 'testCommand', 'hasTestCommand']
        }
      ],
      deploy: [
        {
          id: 'docker-login',
          name: 'Login to Docker Hub',
          uses: 'docker/login-action@v3',
          with: {
            'username': '${{ secrets.DOCKER_USERNAME }}',
            'password': '${{ secrets.DOCKER_PASSWORD }}'
          },
          variables: []
        },
        {
          id: 'docker-push',
          name: 'Push Docker image',
          command: 'docker push {{ imageName }}:{{ imageTag }}',
          variables: ['imageName', 'imageTag']
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'Docker containerization CI/CD template',
        requiredSecrets: ['DOCKER_USERNAME', 'DOCKER_PASSWORD'],
        estimatedDuration: 15
      }
    });
  }

  /**
   * Initialize frontend tooling templates
   */
  private initializeFrontendTemplates(): void {
    // Webpack template
    this.registerTemplate('webpack', {
      setup: [
        {
          id: 'setup-node',
          name: 'Setup Node.js',
          uses: 'actions/setup-node@v4',
          with: {
            'node-version': '{{ nodeVersion }}',
            'cache': '{{ packageManager }}'
          },
          variables: ['nodeVersion', 'packageManager']
        }
      ],
      build: [
        {
          id: 'install-deps',
          name: 'Install dependencies',
          command: '{{ packageManager }} install',
          variables: ['packageManager']
        },
        {
          id: 'webpack-build',
          name: 'Build with Webpack',
          command: '{{ packageManager }} run build',
          variables: ['packageManager']
        }
      ],
      test: [
        {
          id: 'run-tests',
          name: 'Run tests',
          command: '{{ packageManager }} test',
          condition: '{{ hasTestScript }}',
          variables: ['packageManager', 'hasTestScript']
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'Webpack build tool CI/CD template',
        requiredSecrets: [],
        estimatedDuration: 8
      }
    });

    // Vite template
    this.registerTemplate('vite', {
      setup: [
        {
          id: 'setup-node',
          name: 'Setup Node.js',
          uses: 'actions/setup-node@v4',
          with: {
            'node-version': '{{ nodeVersion }}',
            'cache': '{{ packageManager }}'
          },
          variables: ['nodeVersion', 'packageManager']
        }
      ],
      build: [
        {
          id: 'install-deps',
          name: 'Install dependencies',
          command: '{{ packageManager }} install',
          variables: ['packageManager']
        },
        {
          id: 'vite-build',
          name: 'Build with Vite',
          command: '{{ packageManager }} run build',
          variables: ['packageManager']
        }
      ],
      test: [
        {
          id: 'run-tests',
          name: 'Run tests',
          command: '{{ packageManager }} test',
          condition: '{{ hasTestScript }}',
          variables: ['packageManager', 'hasTestScript']
        }
      ],
      metadata: {
        version: '1.0.0',
        description: 'Vite build tool CI/CD template',
        requiredSecrets: [],
        estimatedDuration: 6
      }
    });
  }
}