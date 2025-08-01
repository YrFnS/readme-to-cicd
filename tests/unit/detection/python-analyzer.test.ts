import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PythonAnalyzer } from '../../../src/detection/analyzers/python';
import { ProjectInfo } from '../../../src/detection/interfaces/language-analyzer';
import { FileSystemScanner } from '../../../src/detection/utils/file-scanner';

// Mock the FileSystemScanner
vi.mock('../../../src/detection/utils/file-scanner');

describe('PythonAnalyzer', () => {
  let analyzer: PythonAnalyzer;
  let mockFileScanner: vi.Mocked<FileSystemScanner>;

  beforeEach(() => {
    analyzer = new PythonAnalyzer();
    mockFileScanner = vi.mocked(FileSystemScanner.prototype);
  });

  describe('canAnalyze', () => {
    it('should return true for Python projects', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['Python'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when requirements.txt is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['requirements.txt'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when setup.py is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['setup.py'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when Pipfile is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Pipfile'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when pyproject.toml is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['pyproject.toml'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when pip commands are present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: ['pip install -r requirements.txt'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when pipenv commands are present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: ['pipenv install'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when poetry commands are present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: ['poetry install'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return false for non-Python projects', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: ['npm install'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(false);
    });
  });

  describe('analyze', () => {
    it('should detect Django framework from requirements.txt', async () => {
      const projectInfo: ProjectInfo = {
        name: 'django-app',
        languages: ['Python'],
        dependencies: ['Django'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['requirements.txt'],
        rawContent: 'A Django web application'
      };

      const mockRequirementsTxt = 'Django>=4.0.0\npsycopg2-binary>=2.9.0';

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'requirements.txt') return Promise.resolve(true);
        if (file === 'manage.py') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockImplementation((filePath) => {
        if (filePath.includes('requirements.txt')) return Promise.resolve(mockRequirementsTxt);
        return Promise.resolve('');
      });
      mockFileScanner.findConfigFiles.mockResolvedValue(['requirements.txt']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const djangoFramework = result.frameworks.find(f => f.name === 'Django');
      expect(djangoFramework).toBeDefined();
      expect(djangoFramework?.name).toBe('Django');
      expect(djangoFramework?.type).toBe('web_framework');
      expect(djangoFramework?.confidence).toBeGreaterThan(0.5);
      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('pip');
    });

    it('should detect Flask framework from setup.py', async () => {
      const projectInfo: ProjectInfo = {
        name: 'flask-api',
        languages: ['Python'],
        dependencies: ['Flask'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['setup.py'],
        rawContent: 'A Flask REST API'
      };

      const mockSetupPy = `
from setuptools import setup, find_packages

setup(
    name="flask-api",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "Flask>=2.0.0",
        "Flask-RESTful>=0.3.9"
    ],
    python_requires=">=3.8"
)`;

      const mockAppPy = 'from flask import Flask\n\napp = Flask(__name__)';

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'setup.py') return Promise.resolve(true);
        if (file === 'app.py') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockImplementation((filePath) => {
        if (filePath.includes('setup.py')) return Promise.resolve(mockSetupPy);
        if (filePath.includes('app.py')) return Promise.resolve(mockAppPy);
        return Promise.resolve('');
      });
      mockFileScanner.findConfigFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const flaskFramework = result.frameworks.find(f => f.name === 'Flask');
      expect(flaskFramework).toBeDefined();
      expect(flaskFramework?.name).toBe('Flask');
      expect(flaskFramework?.type).toBe('web_framework');
      expect(flaskFramework?.confidence).toBeGreaterThan(0.5);
    });

    it('should detect FastAPI framework from Pipfile', async () => {
      const projectInfo: ProjectInfo = {
        name: 'fastapi-service',
        languages: ['Python'],
        dependencies: ['fastapi'],
        buildCommands: ['pipenv install'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Pipfile'],
        rawContent: 'A FastAPI microservice'
      };

      const mockPipfile = `
[[source]]
url = "https://pypi.org/simple"
verify_ssl = true
name = "pypi"

[packages]
fastapi = ">=0.68.0"
uvicorn = {extras = ["standard"], version = ">=0.15.0"}

[dev-packages]
pytest = "*"

[requires]
python_version = "3.9"`;

      const mockMainPy = 'from fastapi import FastAPI\n\napp = FastAPI()';

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'Pipfile') return Promise.resolve(true);
        if (file === 'main.py') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockImplementation((filePath) => {
        if (filePath.includes('Pipfile')) return Promise.resolve(mockPipfile);
        if (filePath.includes('main.py')) return Promise.resolve(mockMainPy);
        return Promise.resolve('');
      });
      mockFileScanner.findConfigFiles.mockResolvedValue(['Pipfile.lock']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const fastapiFramework = result.frameworks.find(f => f.name === 'FastAPI');
      expect(fastapiFramework).toBeDefined();
      expect(fastapiFramework?.name).toBe('FastAPI');
      expect(fastapiFramework?.type).toBe('api_framework');
      expect(fastapiFramework?.confidence).toBeGreaterThan(0.5);
      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('pipenv');
    });

    it('should detect Poetry package manager from pyproject.toml', async () => {
      const projectInfo: ProjectInfo = {
        name: 'poetry-project',
        languages: ['Python'],
        dependencies: ['django'],
        buildCommands: ['poetry install'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['pyproject.toml'],
        rawContent: 'A Django project managed with Poetry'
      };

      const mockPyprojectToml = `
[tool.poetry]
name = "django-project"
version = "0.1.0"
description = ""
authors = ["Author <author@example.com>"]

[tool.poetry.dependencies]
python = "^3.9"
Django = "^4.0.0"

[tool.poetry.dev-dependencies]
pytest = "^7.0.0"

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"

[tool.poetry.scripts]
manage = "manage:main"`;

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'pyproject.toml') return Promise.resolve(true);
        if (file === 'manage.py') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockImplementation((filePath) => {
        if (filePath.includes('pyproject.toml')) return Promise.resolve(mockPyprojectToml);
        return Promise.resolve('');
      });
      mockFileScanner.findConfigFiles.mockResolvedValue(['poetry.lock']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('poetry');
      expect(result.buildTools[0].configFile).toBe('pyproject.toml');
      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const djangoFramework = result.frameworks.find(f => f.name === 'Django');
      expect(djangoFramework).toBeDefined();
    });

    it('should detect multiple frameworks in a project', async () => {
      const projectInfo: ProjectInfo = {
        name: 'multi-framework-project',
        languages: ['Python'],
        dependencies: ['Django', 'Flask'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['requirements.txt'],
        rawContent: 'A project with both Django and Flask components'
      };

      const mockRequirementsTxt = 'Django>=4.0.0\nFlask>=2.0.0\nFastAPI>=0.68.0';

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'requirements.txt') return Promise.resolve(true);
        if (file === 'manage.py') return Promise.resolve(true);
        if (file === 'app.py') return Promise.resolve(true);
        if (file === 'main.py') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockImplementation((filePath) => {
        if (filePath.includes('requirements.txt')) return Promise.resolve(mockRequirementsTxt);
        if (filePath.includes('app.py')) return Promise.resolve('from flask import Flask');
        if (filePath.includes('main.py')) return Promise.resolve('from fastapi import FastAPI');
        return Promise.resolve('');
      });
      mockFileScanner.findConfigFiles.mockResolvedValue(['requirements.txt']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(2);
      const frameworkNames = result.frameworks.map(f => f.name);
      expect(frameworkNames).toContain('Django');
      expect(frameworkNames).toContain('Flask');
      expect(frameworkNames).toContain('FastAPI');
    });

    it('should extract Python version from pyproject.toml', async () => {
      const projectInfo: ProjectInfo = {
        name: 'versioned-project',
        languages: ['Python'],
        dependencies: ['flask'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['pyproject.toml'],
        rawContent: 'A Flask project with specific Python version'
      };

      const mockPyprojectToml = `
[project]
name = "flask-project"
version = "0.1.0"
requires-python = ">=3.9"
dependencies = [
    "Flask>=2.0.0"
]`;

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'pyproject.toml') return Promise.resolve(true);
        if (file === 'app.py') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockImplementation((filePath) => {
        if (filePath.includes('pyproject.toml')) return Promise.resolve(mockPyprojectToml);
        if (filePath.includes('app.py')) return Promise.resolve('from flask import Flask');
        return Promise.resolve('');
      });
      mockFileScanner.findConfigFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const flaskFramework = result.frameworks.find(f => f.name === 'Flask');
      expect(flaskFramework?.metadata?.pythonVersion).toBe('>=3.9');
    });

    it('should extract Python version from Pipfile', async () => {
      const projectInfo: ProjectInfo = {
        name: 'pipenv-project',
        languages: ['Python'],
        dependencies: ['django'],
        buildCommands: ['pipenv install'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Pipfile'],
        rawContent: 'A Django project with Pipenv'
      };

      const mockPipfile = `
[[source]]
url = "https://pypi.org/simple"
verify_ssl = true
name = "pypi"

[packages]
Django = ">=4.0.0"

[dev-packages]

[requires]
python_version = "3.10"`;

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'Pipfile') return Promise.resolve(true);
        if (file === 'manage.py') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockImplementation((filePath) => {
        if (filePath.includes('Pipfile')) return Promise.resolve(mockPipfile);
        return Promise.resolve('');
      });
      mockFileScanner.findConfigFiles.mockResolvedValue(['Pipfile.lock']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const djangoFramework = result.frameworks.find(f => f.name === 'Django');
      expect(djangoFramework?.metadata?.pythonVersion).toBe('3.10');
    });

    it('should extract Python version from setup.py', async () => {
      const projectInfo: ProjectInfo = {
        name: 'setup-project',
        languages: ['Python'],
        dependencies: ['fastapi'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['setup.py'],
        rawContent: 'A FastAPI project with setup.py'
      };

      const mockSetupPy = `
from setuptools import setup

setup(
    name="fastapi-project",
    version="1.0.0",
    install_requires=[
        "fastapi>=0.68.0",
        "uvicorn>=0.15.0"
    ],
    python_requires=">=3.8"
)`;

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'setup.py') return Promise.resolve(true);
        if (file === 'main.py') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockImplementation((filePath) => {
        if (filePath.includes('setup.py')) return Promise.resolve(mockSetupPy);
        if (filePath.includes('main.py')) return Promise.resolve('from fastapi import FastAPI');
        return Promise.resolve('');
      });
      mockFileScanner.findConfigFiles.mockResolvedValue([]);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const fastapiFramework = result.frameworks.find(f => f.name === 'FastAPI');
      expect(fastapiFramework?.metadata?.pythonVersion).toBe('>=3.8');
    });

    it('should handle missing dependency files gracefully', async () => {
      const projectInfo: ProjectInfo = {
        name: 'minimal-project',
        languages: ['Python'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'A minimal Python project'
      };

      mockFileScanner.fileExists.mockResolvedValue(false);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks).toHaveLength(0);
      expect(result.confidence).toBeLessThan(0.7);
      expect(result.recommendations).toContain(
        'Add a requirements.txt file or use a package manager like Poetry or Pipenv to manage dependencies.'
      );
    });

    it('should handle file parsing errors gracefully', async () => {
      const projectInfo: ProjectInfo = {
        name: 'broken-project',
        languages: ['Python'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['requirements.txt'],
        rawContent: ''
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockRejectedValue(new Error('File read error'));
      mockFileScanner.findConfigFiles.mockResolvedValue(['requirements.txt']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.metadata.warnings).toContain('Failed to parse requirements.txt: File read error');
      // The build tool (pip) is still detected from the config file, so confidence is higher
      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('pip');
    });

    it('should detect virtual environment indicators', async () => {
      const projectInfo: ProjectInfo = {
        name: 'venv-project',
        languages: ['Python'],
        dependencies: [],
        buildCommands: ['pip install -r requirements.txt'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['requirements.txt'],
        rawContent: 'A Python project using venv for virtual environment'
      };

      const mockRequirementsTxt = 'requests>=2.25.0\nnumpy>=1.20.0';

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'requirements.txt') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockResolvedValue(mockRequirementsTxt);
      mockFileScanner.findConfigFiles.mockResolvedValue(['requirements.txt']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('pip');
      // Since no frameworks are detected, we get the "no frameworks detected" recommendation
      expect(result.recommendations).toContain('No specific Python frameworks detected. Consider adding framework dependencies to your dependency files.');
    });

    it('should provide appropriate recommendations', async () => {
      const projectInfo: ProjectInfo = {
        name: 'django-project',
        languages: ['Python'],
        dependencies: ['Django'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['requirements.txt'],
        rawContent: 'A Django web application'
      };

      const mockRequirementsTxt = 'Django>=4.0.0';

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'requirements.txt') return Promise.resolve(true);
        if (file === 'manage.py') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockResolvedValue(mockRequirementsTxt);
      mockFileScanner.findConfigFiles.mockResolvedValue(['requirements.txt']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.recommendations).toContain('Consider using Poetry or pipenv for better dependency management with Django projects.');
      expect(result.recommendations).toContain('Ensure you have a proper Django settings configuration for different environments.');
      expect(result.recommendations).toContain('Add a testing framework like pytest to enable automated testing.');
    });

    it('should handle analysis errors gracefully', async () => {
      const projectInfo: ProjectInfo = {
        name: 'error-project',
        languages: ['Python'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      mockFileScanner.fileExists.mockRejectedValue(new Error('File system error'));

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.confidence).toBe(0.1);
      expect(result.recommendations).toContain('Unable to complete Python analysis due to errors');
      expect(result.metadata.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('package manager detection', () => {
    it('should prioritize Poetry when poetry.lock is present', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['Python'],
        dependencies: [],
        buildCommands: ['poetry install'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['pyproject.toml', 'poetry.lock'],
        rawContent: ''
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue('');
      mockFileScanner.findConfigFiles.mockResolvedValue(['poetry.lock']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.buildTools[0].name).toBe('poetry');
    });

    it('should detect Pipenv when Pipfile.lock is present', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['Python'],
        dependencies: [],
        buildCommands: ['pipenv install'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Pipfile'],
        rawContent: ''
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue('');
      mockFileScanner.findConfigFiles.mockResolvedValue(['Pipfile.lock']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.buildTools[0].name).toBe('pipenv');
    });

    it('should default to pip when only requirements.txt is present', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['Python'],
        dependencies: [],
        buildCommands: ['pip install -r requirements.txt'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['requirements.txt'],
        rawContent: ''
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue('requests>=2.25.0');
      mockFileScanner.findConfigFiles.mockResolvedValue(['requirements.txt']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.buildTools[0].name).toBe('pip');
    });
  });

  describe('confidence calculation', () => {
    it('should return high confidence for well-defined projects', async () => {
      const projectInfo: ProjectInfo = {
        name: 'well-defined-project',
        languages: ['Python'],
        dependencies: ['Django', 'pytest'],
        buildCommands: ['poetry install'],
        testCommands: ['poetry run pytest'],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['pyproject.toml'],
        rawContent: 'A well-defined Django project with Poetry and pytest'
      };

      const mockPyprojectToml = `
[tool.poetry]
name = "django-project"
version = "0.1.0"

[tool.poetry.dependencies]
python = "^3.9"
Django = "^4.0.0"

[tool.poetry.dev-dependencies]
pytest = "^7.0.0"

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"`;

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'pyproject.toml') return Promise.resolve(true);
        if (file === 'manage.py') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockResolvedValue(mockPyprojectToml);
      mockFileScanner.findConfigFiles.mockResolvedValue(['poetry.lock']);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should return low confidence for minimal projects', async () => {
      const projectInfo: ProjectInfo = {
        name: 'minimal-project',
        languages: ['Python'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'A minimal Python project'
      };

      mockFileScanner.fileExists.mockResolvedValue(false);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.confidence).toBeLessThan(0.7);
    });
  });
});