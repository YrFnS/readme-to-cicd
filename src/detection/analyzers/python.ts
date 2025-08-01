import { BaseLanguageAnalyzer } from './base';
import { LanguageDetectionResult, ProjectInfo } from '../interfaces/language-analyzer';
import { FrameworkInfo, BuildToolInfo, FrameworkType } from '../interfaces/framework-info';
import { CIStep } from '../interfaces/ci-pipeline';
import { Evidence, EvidenceType } from '../interfaces/evidence';
import { FileSystemScanner } from '../utils/file-scanner';
import { EvidenceCollectorImpl } from '../utils/evidence-collector';

/**
 * Python framework analyzer
 */
export class PythonAnalyzer extends BaseLanguageAnalyzer {
  readonly name = 'Python Analyzer';
  readonly ecosystem = 'python';

  private fileScanner = new FileSystemScanner();
  private evidenceCollector = new EvidenceCollectorImpl();

  canAnalyze(projectInfo: ProjectInfo): boolean {
    // Check for Python indicators
    return projectInfo.languages.includes('Python') ||
           this.hasConfigFile(projectInfo, 'requirements.txt') ||
           this.hasConfigFile(projectInfo, 'setup.py') ||
           this.hasConfigFile(projectInfo, 'Pipfile') ||
           this.hasConfigFile(projectInfo, 'pyproject.toml') ||
           this.hasDependency(projectInfo, 'python') ||
           this.hasCommand(projectInfo, 'pip') ||
           this.hasCommand(projectInfo, 'pipenv') ||
           this.hasCommand(projectInfo, 'poetry');
  }

  async analyze(projectInfo: ProjectInfo, projectPath?: string): Promise<LanguageDetectionResult> {
    const startTime = Date.now();
    const frameworks: FrameworkInfo[] = [];
    const buildTools: BuildToolInfo[] = [];
    const warnings: string[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    try {
      // Parse Python dependency files
      const dependencyData = await this.parseDependencyFiles(projectInfo, projectPath, filesAnalyzed, warnings);

      // Detect package manager and virtual environment
      const packageManager = await this.detectPackageManager(projectInfo, projectPath, dependencyData);
      if (packageManager) {
        buildTools.push(packageManager);
      }

      // Detect Python version
      const pythonVersion = this.extractPythonVersion(dependencyData);

      // Detect frameworks
      const detectedFrameworks = await this.detectFrameworks(projectInfo, dependencyData, projectPath, pythonVersion);
      frameworks.push(...detectedFrameworks);
      
      // Track patterns matched
      detectedFrameworks.forEach(framework => {
        patternsMatched.push(`${framework.name}_detection`);
      });

      // Generate recommendations
      const recommendations = this.generateRecommendations(frameworks, dependencyData, packageManager);

      return {
        frameworks,
        buildTools,
        confidence: this.calculateConfidence(frameworks, buildTools),
        recommendations,
        metadata: {
          executionTime: Date.now() - startTime,
          filesAnalyzed,
          patternsMatched,
          warnings
        }
      };
    } catch (error) {
      warnings.push(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        frameworks,
        buildTools,
        confidence: 0.1,
        recommendations: ['Unable to complete Python analysis due to errors'],
        metadata: {
          executionTime: Date.now() - startTime,
          filesAnalyzed,
          patternsMatched,
          warnings
        }
      };
    }
  }

  /**
   * Parse Python dependency files
   */
  private async parseDependencyFiles(
    projectInfo: ProjectInfo, 
    projectPath?: string, 
    filesAnalyzed: string[] = [], 
    warnings: string[] = []
  ): Promise<PythonDependencyData> {
    const dependencyData: PythonDependencyData = {
      requirements: [],
      setupPy: null,
      pipfile: null,
      pyprojectToml: null,
      pythonVersion: null
    };

    if (!projectPath) {
      return dependencyData;
    }

    // Parse requirements.txt
    if (await this.fileScanner.fileExists(projectPath, 'requirements.txt')) {
      try {
        const content = await this.fileScanner.readConfigFile(`${projectPath}/requirements.txt`);
        dependencyData.requirements = this.parseRequirementsTxt(content);
        filesAnalyzed.push('requirements.txt');
      } catch (error) {
        warnings.push(`Failed to parse requirements.txt: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Parse setup.py
    if (await this.fileScanner.fileExists(projectPath, 'setup.py')) {
      try {
        const content = await this.fileScanner.readConfigFile(`${projectPath}/setup.py`);
        dependencyData.setupPy = this.parseSetupPy(content);
        filesAnalyzed.push('setup.py');
      } catch (error) {
        warnings.push(`Failed to parse setup.py: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Parse Pipfile
    if (await this.fileScanner.fileExists(projectPath, 'Pipfile')) {
      try {
        const content = await this.fileScanner.readConfigFile(`${projectPath}/Pipfile`);
        dependencyData.pipfile = this.parsePipfile(content);
        filesAnalyzed.push('Pipfile');
      } catch (error) {
        warnings.push(`Failed to parse Pipfile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Parse pyproject.toml
    if (await this.fileScanner.fileExists(projectPath, 'pyproject.toml')) {
      try {
        const content = await this.fileScanner.readConfigFile(`${projectPath}/pyproject.toml`);
        dependencyData.pyprojectToml = this.parsePyprojectToml(content);
        filesAnalyzed.push('pyproject.toml');
      } catch (error) {
        warnings.push(`Failed to parse pyproject.toml: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return dependencyData;
  }

  /**
   * Parse requirements.txt content
   */
  private parseRequirementsTxt(content: string): PythonDependency[] {
    const dependencies: PythonDependency[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
        const match = trimmed.match(/^([a-zA-Z0-9_-]+)([>=<~!]+.*)?$/);
        if (match && match[1]) {
          dependencies.push({
            name: match[1].toLowerCase(),
            version: match[2] || '',
            source: 'requirements.txt'
          });
        }
      }
    }

    return dependencies;
  }

  /**
   * Parse setup.py content (basic extraction)
   */
  private parseSetupPy(content: string): SetupPyData {
    const data: SetupPyData = {
      dependencies: [],
      pythonRequires: null
    };

    // Extract install_requires dependencies
    const installRequiresMatch = content.match(/install_requires\s*=\s*\[(.*?)\]/s);
    if (installRequiresMatch && installRequiresMatch[1]) {
      const deps = installRequiresMatch[1].match(/'([^']+)'|"([^"]+)"/g);
      if (deps) {
        deps.forEach(dep => {
          const cleanDep = dep.replace(/['"]/g, '');
          const match = cleanDep.match(/^([a-zA-Z0-9_-]+)([>=<~!]+.*)?$/);
          if (match && match[1]) {
            data.dependencies.push({
              name: match[1].toLowerCase(),
              version: match[2] || '',
              source: 'setup.py'
            });
          }
        });
      }
    }

    // Extract python_requires
    const pythonRequiresMatch = content.match(/python_requires\s*=\s*['"]([^'"]+)['"]/);
    if (pythonRequiresMatch && pythonRequiresMatch[1]) {
      data.pythonRequires = pythonRequiresMatch[1];
    }

    return data;
  }

  /**
   * Parse Pipfile content (basic TOML-like parsing)
   */
  private parsePipfile(content: string): PipfileData {
    const data: PipfileData = {
      dependencies: [],
      devDependencies: [],
      pythonVersion: null
    };

    // Extract Python version
    const pythonMatch = content.match(/python_version\s*=\s*['"]([^'"]+)['"]/);
    if (pythonMatch && pythonMatch[1]) {
      data.pythonVersion = pythonMatch[1];
    }

    // Extract [packages] section
    const packagesMatch = content.match(/\[packages\](.*?)(?=\[|$)/s);
    if (packagesMatch && packagesMatch[1]) {
      const packages = packagesMatch[1];
      const packageLines = packages.split('\n');
      for (const line of packageLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*['"]([^'"]*)['"]/);
          if (match && match[1]) {
            data.dependencies.push({
              name: match[1].toLowerCase(),
              version: match[2] || '',
              source: 'Pipfile'
            });
          }
        }
      }
    }

    // Extract [dev-packages] section
    const devPackagesMatch = content.match(/\[dev-packages\](.*?)(?=\[|$)/s);
    if (devPackagesMatch && devPackagesMatch[1]) {
      const devPackages = devPackagesMatch[1];
      const packageLines = devPackages.split('\n');
      for (const line of packageLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*['"]([^'"]*)['"]/);
          if (match && match[1]) {
            data.devDependencies.push({
              name: match[1].toLowerCase(),
              version: match[2] || '',
              source: 'Pipfile'
            });
          }
        }
      }
    }

    return data;
  }

  /**
   * Parse pyproject.toml content (basic parsing)
   */
  private parsePyprojectToml(content: string | any): PyprojectTomlData {
    const data: PyprojectTomlData = {
      dependencies: [],
      devDependencies: [],
      pythonVersion: null,
      buildSystem: null
    };

    // If content is already parsed as TOML object
    if (typeof content === 'object' && content._format === 'toml') {
      // For now, return empty data since we don't have TOML parser
      // This can be enhanced later with a proper TOML parser
      return data;
    }

    // Basic string parsing for common patterns
    if (typeof content === 'string') {
      // Extract Python version from requires-python
      const pythonMatch = content.match(/requires-python\s*=\s*['"]([^'"]+)['"]/);
      if (pythonMatch && pythonMatch[1]) {
        data.pythonVersion = pythonMatch[1];
      }

      // Extract dependencies from [project] section
      const dependenciesMatch = content.match(/dependencies\s*=\s*\[(.*?)\]/s);
      if (dependenciesMatch && dependenciesMatch[1]) {
        const deps = dependenciesMatch[1].match(/'([^']+)'|"([^"]+)"/g);
        if (deps) {
          deps.forEach(dep => {
            const cleanDep = dep.replace(/['"]/g, '');
            const match = cleanDep.match(/^([a-zA-Z0-9_-]+)([>=<~!]+.*)?$/);
            if (match && match[1]) {
              data.dependencies.push({
                name: match[1].toLowerCase(),
                version: match[2] || '',
                source: 'pyproject.toml'
              });
            }
          });
        }
      }

      // Extract build system
      const buildSystemMatch = content.match(/\[build-system\](.*?)(?=\[|$)/s);
      if (buildSystemMatch && buildSystemMatch[1]) {
        const buildSystem = buildSystemMatch[1];
        if (buildSystem.includes('poetry')) {
          data.buildSystem = 'poetry';
        } else if (buildSystem.includes('setuptools')) {
          data.buildSystem = 'setuptools';
        } else if (buildSystem.includes('flit')) {
          data.buildSystem = 'flit';
        }
      }
    }

    return data;
  }

  /**
   * Extract Python version from dependency data
   */
  private extractPythonVersion(dependencyData: PythonDependencyData): string | null {
    // Priority order: pyproject.toml > Pipfile > setup.py
    if (dependencyData.pyprojectToml?.pythonVersion) {
      return dependencyData.pyprojectToml.pythonVersion;
    }
    if (dependencyData.pipfile?.pythonVersion) {
      return dependencyData.pipfile.pythonVersion;
    }
    if (dependencyData.setupPy?.pythonRequires) {
      return dependencyData.setupPy.pythonRequires;
    }
    return null;
  }

  /**
   * Detect package manager and virtual environment
   */
  private async detectPackageManager(
    projectInfo: ProjectInfo, 
    projectPath?: string, 
    dependencyData?: PythonDependencyData
  ): Promise<BuildToolInfo | null> {
    const evidence: Evidence[] = [];

    // Check for Poetry
    if (dependencyData?.pyprojectToml?.buildSystem === 'poetry' || 
        this.hasConfigFile(projectInfo, 'poetry.lock') ||
        this.hasCommand(projectInfo, 'poetry')) {
      evidence.push({
        type: 'config_file',
        source: 'poetry',
        value: 'poetry',
        weight: 0.9
      });
    }

    // Check for Pipenv
    if (dependencyData?.pipfile || 
        this.hasConfigFile(projectInfo, 'Pipfile') ||
        this.hasConfigFile(projectInfo, 'Pipfile.lock') ||
        this.hasCommand(projectInfo, 'pipenv')) {
      evidence.push({
        type: 'config_file',
        source: 'pipenv',
        value: 'pipenv',
        weight: 0.8
      });
    }

    // Check for pip with virtual environment indicators
    if (this.hasCommand(projectInfo, 'pip') ||
        this.hasConfigFile(projectInfo, 'requirements.txt') ||
        projectInfo.rawContent.toLowerCase().includes('venv') ||
        projectInfo.rawContent.toLowerCase().includes('virtualenv')) {
      evidence.push({
        type: 'command_pattern',
        source: 'pip',
        value: 'pip',
        weight: 0.6
      });
    }

    // Check file system if path provided
    if (projectPath) {
      const configFiles = await this.fileScanner.findConfigFiles(projectPath, [
        'poetry.lock', 'Pipfile.lock', 'requirements.txt'
      ]);
      
      configFiles.forEach(file => {
        if (file.includes('poetry')) {
          evidence.push({
            type: 'config_file',
            source: file,
            value: 'poetry',
            weight: 0.9
          });
        } else if (file.includes('Pipfile')) {
          evidence.push({
            type: 'config_file',
            source: file,
            value: 'pipenv',
            weight: 0.8
          });
        } else if (file.includes('requirements')) {
          evidence.push({
            type: 'config_file',
            source: file,
            value: 'pip',
            weight: 0.7
          });
        }
      });
    }

    if (evidence.length === 0) {
      return null;
    }

    // Determine primary package manager
    const managerCounts = evidence.reduce((acc, e) => {
      acc[e.value] = (acc[e.value] || 0) + e.weight;
      return acc;
    }, {} as Record<string, number>);

    const entries = Object.entries(managerCounts);
    if (entries.length === 0) {
      return null;
    }
    const sortedEntries = entries.sort(([,a], [,b]) => b - a);
    const primaryManagerEntry = sortedEntries[0];
    if (!primaryManagerEntry) {
      return null;
    }
    const primaryManager = primaryManagerEntry[0];
    const primaryManagerScore = managerCounts[primaryManager];
    if (primaryManagerScore === undefined) {
      return null;
    }

    return {
      name: primaryManager,
      configFile: this.getPackageManagerConfigFile(primaryManager),
      commands: this.getPackageManagerCommands(primaryManager),
      confidence: Math.min(primaryManagerScore / evidence.length, 1.0)
    };
  }

  /**
   * Get config file for package manager
   */
  private getPackageManagerConfigFile(manager: string): string {
    const configFiles = {
      poetry: 'pyproject.toml',
      pipenv: 'Pipfile',
      pip: 'requirements.txt'
    };
    return configFiles[manager as keyof typeof configFiles] || 'requirements.txt';
  }

  /**
   * Get commands for package manager
   */
  private getPackageManagerCommands(manager: string) {
    const commands = {
      poetry: [
        { name: 'install', command: 'poetry install', description: 'Install dependencies', isPrimary: true },
        { name: 'build', command: 'poetry build', description: 'Build package', isPrimary: true },
        { name: 'test', command: 'poetry run pytest', description: 'Run tests', isPrimary: true },
        { name: 'run', command: 'poetry run python', description: 'Run Python', isPrimary: false }
      ],
      pipenv: [
        { name: 'install', command: 'pipenv install', description: 'Install dependencies', isPrimary: true },
        { name: 'shell', command: 'pipenv shell', description: 'Activate virtual environment', isPrimary: true },
        { name: 'run', command: 'pipenv run python', description: 'Run Python', isPrimary: false }
      ],
      pip: [
        { name: 'install', command: 'pip install -r requirements.txt', description: 'Install dependencies', isPrimary: true },
        { name: 'freeze', command: 'pip freeze > requirements.txt', description: 'Freeze dependencies', isPrimary: false },
        { name: 'test', command: 'python -m pytest', description: 'Run tests', isPrimary: true }
      ]
    };

    return commands[manager as keyof typeof commands] || commands.pip;
  }

  /**
   * Detect Python frameworks
   */
  private async detectFrameworks(
    projectInfo: ProjectInfo, 
    dependencyData: PythonDependencyData, 
    projectPath?: string,
    pythonVersion?: string | null
  ): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];

    // Get all dependencies from all sources
    const allDependencies = this.getAllDependencies(dependencyData);

    // Django detection
    const djangoFramework = await this.detectDjango(projectInfo, allDependencies, projectPath);
    if (djangoFramework) frameworks.push(djangoFramework);

    // Flask detection
    const flaskFramework = await this.detectFlask(projectInfo, allDependencies, projectPath);
    if (flaskFramework) frameworks.push(flaskFramework);

    // FastAPI detection
    const fastapiFramework = await this.detectFastAPI(projectInfo, allDependencies, projectPath);
    if (fastapiFramework) frameworks.push(fastapiFramework);

    // Add Python version to all frameworks
    if (pythonVersion) {
      frameworks.forEach(framework => {
        framework.metadata = { ...framework.metadata, pythonVersion };
      });
    }

    return frameworks;
  }

  /**
   * Get all dependencies from all sources
   */
  private getAllDependencies(dependencyData: PythonDependencyData): PythonDependency[] {
    const allDeps: PythonDependency[] = [];
    
    allDeps.push(...dependencyData.requirements);
    if (dependencyData.setupPy) {
      allDeps.push(...dependencyData.setupPy.dependencies);
    }
    if (dependencyData.pipfile) {
      allDeps.push(...dependencyData.pipfile.dependencies);
      allDeps.push(...dependencyData.pipfile.devDependencies);
    }
    if (dependencyData.pyprojectToml) {
      allDeps.push(...dependencyData.pyprojectToml.dependencies);
      allDeps.push(...dependencyData.pyprojectToml.devDependencies);
    }

    return allDeps;
  }

  /**
   * Detect Django framework
   */
  private async detectDjango(
    projectInfo: ProjectInfo, 
    dependencies: PythonDependency[], 
    projectPath?: string
  ): Promise<FrameworkInfo | null> {
    const evidence: Evidence[] = [];

    // Check dependencies
    const djangoDep = dependencies.find(dep => dep.name === 'django');
    if (djangoDep) {
      evidence.push({
        type: 'dependency',
        source: djangoDep.source,
        value: `django${djangoDep.version}`,
        weight: 0.9
      });
    }

    // Check for Django-specific files
    if (projectPath) {
      try {
        if (await this.fileScanner.fileExists(projectPath, 'manage.py')) {
          evidence.push({
            type: 'file_pattern',
            source: 'manage.py',
            value: 'manage.py',
            weight: 0.9
          });
        }

        // Check for settings.py in common locations
        const settingsLocations = ['settings.py', 'settings/settings.py', '*/settings.py'];
        for (const location of settingsLocations) {
          if (await this.fileScanner.fileExists(projectPath, location)) {
            evidence.push({
              type: 'file_pattern',
              source: location,
              value: 'settings.py',
              weight: 0.8
            });
            break;
          }
        }
      } catch (error) {
        // Ignore file system errors during framework detection
      }
    }

    // Check project info (only if we don't have stronger evidence and no file system errors)
    if (!djangoDep && dependencies.length === 0 && this.hasDependency(projectInfo, 'django')) {
      evidence.push({
        type: 'dependency',
        source: 'project_info',
        value: 'django',
        weight: 0.4
      });
    }

    // Check text mentions (only if we already have stronger evidence)
    if (evidence.length > 0 && projectInfo.rawContent.toLowerCase().includes('django')) {
      evidence.push({
        type: 'text_mention',
        source: 'readme',
        value: 'django',
        weight: 0.2
      });
    }

    if (evidence.length === 0) return null;

    const confidence = this.calculateFrameworkConfidence(evidence);
    if (confidence < 0.5) return null;

    return this.createFrameworkInfo(
      'Django',
      'web_framework' as FrameworkType,
      confidence,
      evidence,
      djangoDep?.version
    );
  }

  /**
   * Detect Flask framework
   */
  private async detectFlask(
    projectInfo: ProjectInfo, 
    dependencies: PythonDependency[], 
    projectPath?: string
  ): Promise<FrameworkInfo | null> {
    const evidence: Evidence[] = [];

    // Check dependencies
    const flaskDep = dependencies.find(dep => dep.name === 'flask');
    if (flaskDep) {
      evidence.push({
        type: 'dependency',
        source: flaskDep.source,
        value: `flask${flaskDep.version}`,
        weight: 0.9
      });
    }

    // Check for Flask-specific patterns in common files
    if (projectPath) {
      const commonFiles = ['app.py', 'main.py', 'run.py', 'wsgi.py'];
      for (const file of commonFiles) {
        if (await this.fileScanner.fileExists(projectPath, file)) {
          try {
            const content = await this.fileScanner.readConfigFile(`${projectPath}/${file}`);
            if (typeof content === 'string' && content.includes('from flask import')) {
              evidence.push({
                type: 'import_statement',
                source: file,
                value: 'from flask import',
                weight: 0.8
              });
              break;
            }
          } catch {
            // Ignore file read errors
          }
        }
      }
    }

    // Check project info (only if we don't have stronger evidence)
    if (!flaskDep && this.hasDependency(projectInfo, 'flask')) {
      evidence.push({
        type: 'dependency',
        source: 'project_info',
        value: 'flask',
        weight: 0.4
      });
    }

    // Check text mentions (only if we already have stronger evidence)
    if (evidence.length > 0 && projectInfo.rawContent.toLowerCase().includes('flask')) {
      evidence.push({
        type: 'text_mention',
        source: 'readme',
        value: 'flask',
        weight: 0.2
      });
    }

    if (evidence.length === 0) return null;

    const confidence = this.calculateFrameworkConfidence(evidence);
    if (confidence < 0.5) return null;

    return this.createFrameworkInfo(
      'Flask',
      'web_framework' as FrameworkType,
      confidence,
      evidence,
      flaskDep?.version
    );
  }

  /**
   * Detect FastAPI framework
   */
  private async detectFastAPI(
    projectInfo: ProjectInfo, 
    dependencies: PythonDependency[], 
    projectPath?: string
  ): Promise<FrameworkInfo | null> {
    const evidence: Evidence[] = [];

    // Check dependencies
    const fastapiDep = dependencies.find(dep => dep.name === 'fastapi');
    if (fastapiDep) {
      evidence.push({
        type: 'dependency',
        source: fastapiDep.source,
        value: `fastapi${fastapiDep.version}`,
        weight: 0.9
      });
    }

    // Check for FastAPI-specific patterns in common files
    if (projectPath) {
      const commonFiles = ['main.py', 'app.py', 'api.py', 'server.py'];
      for (const file of commonFiles) {
        if (await this.fileScanner.fileExists(projectPath, file)) {
          try {
            const content = await this.fileScanner.readConfigFile(`${projectPath}/${file}`);
            if (typeof content === 'string' && content.includes('from fastapi import')) {
              evidence.push({
                type: 'import_statement',
                source: file,
                value: 'from fastapi import',
                weight: 0.8
              });
              break;
            }
          } catch {
            // Ignore file read errors
          }
        }
      }
    }

    // Check project info (only if we don't have stronger evidence)
    if (!fastapiDep && this.hasDependency(projectInfo, 'fastapi')) {
      evidence.push({
        type: 'dependency',
        source: 'project_info',
        value: 'fastapi',
        weight: 0.4
      });
    }

    // Check text mentions (only if we already have stronger evidence)
    if (evidence.length > 0 && (projectInfo.rawContent.toLowerCase().includes('fastapi') || 
        projectInfo.rawContent.toLowerCase().includes('fast api'))) {
      evidence.push({
        type: 'text_mention',
        source: 'readme',
        value: 'fastapi',
        weight: 0.2
      });
    }

    if (evidence.length === 0) return null;

    const confidence = this.calculateFrameworkConfidence(evidence);
    if (confidence < 0.5) return null;

    return this.createFrameworkInfo(
      'FastAPI',
      'api_framework' as FrameworkType,
      confidence,
      evidence,
      fastapiDep?.version
    );
  }

  /**
   * Calculate framework confidence based on evidence
   */
  private calculateFrameworkConfidence(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;

    // Calculate weighted confidence
    const totalWeight = evidence.reduce((sum, e) => sum + e.weight, 0);
    
    // Normalize to 0-1 range, be more conservative
    return Math.min(totalWeight / 2.0, 1.0);
  }

  /**
   * Calculate overall confidence for the analysis
   */
  private calculateConfidence(frameworks: FrameworkInfo[], buildTools: BuildToolInfo[]): number {
    if (frameworks.length === 0 && buildTools.length === 0) return 0.1;

    // Prioritize framework confidence over build tool confidence
    if (frameworks.length > 0) {
      const frameworkConfidence = frameworks.reduce((sum, f) => sum + f.confidence, 0) / frameworks.length;
      
      // If we have build tools too, slightly boost confidence
      if (buildTools.length > 0) {
        const buildToolConfidence = buildTools.reduce((sum, b) => sum + b.confidence, 0) / buildTools.length;
        return Math.min((frameworkConfidence * 0.8) + (buildToolConfidence * 0.2), 1.0);
      }
      
      return frameworkConfidence;
    }
    
    // If only build tools, be more conservative
    if (buildTools.length > 0) {
      const buildToolConfidence = buildTools.reduce((sum, b) => sum + b.confidence, 0) / buildTools.length;
      return Math.min(buildToolConfidence * 0.6, 0.7);
    }
    
    return 0.1;
  }

  /**
   * Generate recommendations based on detected frameworks
   */
  private generateRecommendations(
    frameworks: FrameworkInfo[], 
    dependencyData: PythonDependencyData, 
    packageManager?: BuildToolInfo | null
  ): string[] {
    const recommendations: string[] = [];

    // Check for missing dependency files
    const hasDependencyFile = dependencyData.requirements.length > 0 || 
                             dependencyData.setupPy || 
                             dependencyData.pipfile || 
                             dependencyData.pyprojectToml;

    if (!hasDependencyFile) {
      recommendations.push('Add a requirements.txt file or use a package manager like Poetry or Pipenv to manage dependencies.');
    }

    if (frameworks.length === 0) {
      if (hasDependencyFile) {
        recommendations.push('No specific Python frameworks detected. Consider adding framework dependencies to your dependency files.');
      }
      return recommendations;
    }

    // Framework-specific recommendations
    const frameworkNames = frameworks.map(f => f.name.toLowerCase());
    
    if (frameworkNames.includes('django')) {
      if (!dependencyData.pyprojectToml && (!packageManager || packageManager.name === 'pip')) {
        recommendations.push('Consider using Poetry or pipenv for better dependency management with Django projects.');
      }
      recommendations.push('Ensure you have a proper Django settings configuration for different environments.');
    }

    if (frameworkNames.includes('flask')) {
      recommendations.push('Consider using Flask-RESTful or Flask-API for building REST APIs with Flask.');
      if (!frameworkNames.includes('fastapi')) {
        recommendations.push('For high-performance APIs, consider migrating to FastAPI which offers automatic API documentation.');
      }
    }

    if (frameworkNames.includes('fastapi')) {
      recommendations.push('FastAPI automatically generates OpenAPI documentation - make sure to leverage this feature.');
    }

    // Virtual environment recommendations (only if we have dependency files but no advanced package manager)
    if (hasDependencyFile && (!packageManager || packageManager.name === 'pip')) {
      recommendations.push('Consider using a virtual environment (venv, pipenv, or poetry) to isolate project dependencies.');
    }

    // Testing recommendations
    const allDeps = [
      ...dependencyData.requirements,
      ...(dependencyData.setupPy?.dependencies || []),
      ...(dependencyData.pipfile?.dependencies || []),
      ...(dependencyData.pipfile?.devDependencies || []),
      ...(dependencyData.pyprojectToml?.dependencies || []),
      ...(dependencyData.pyprojectToml?.devDependencies || [])
    ];
    
    const hasTestFramework = allDeps.some(dep => 
      ['pytest', 'unittest', 'nose', 'nose2'].includes(dep.name)
    );
    if (!hasTestFramework) {
      recommendations.push('Add a testing framework like pytest to enable automated testing.');
    }

    return recommendations;
  }

  generateCISteps(frameworks: FrameworkInfo[]): CIStep[] {
    // TODO: Implement CI step generation for Python
    // This will be implemented in task 11
    return [];
  }
}

/**
 * Python dependency data structure
 */
interface PythonDependencyData {
  requirements: PythonDependency[];
  setupPy: SetupPyData | null;
  pipfile: PipfileData | null;
  pyprojectToml: PyprojectTomlData | null;
  pythonVersion: string | null;
}

/**
 * Python dependency structure
 */
interface PythonDependency {
  name: string;
  version: string;
  source: string;
}

/**
 * Setup.py data structure
 */
interface SetupPyData {
  dependencies: PythonDependency[];
  pythonRequires: string | null;
}

/**
 * Pipfile data structure
 */
interface PipfileData {
  dependencies: PythonDependency[];
  devDependencies: PythonDependency[];
  pythonVersion: string | null;
}

/**
 * pyproject.toml data structure
 */
interface PyprojectTomlData {
  dependencies: PythonDependency[];
  devDependencies: PythonDependency[];
  pythonVersion: string | null;
  buildSystem: string | null;
}