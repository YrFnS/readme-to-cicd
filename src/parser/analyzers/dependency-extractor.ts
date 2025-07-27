import { AnalyzerResult, DependencyInfo, Dependency, PackageManagerType } from '../types';
import { MarkdownAST, MarkdownUtils } from '../../shared/markdown-parser';
import { BaseAnalyzer } from './base-analyzer';

/**
 * Extracts dependency information from README content
 */
export class DependencyExtractor extends BaseAnalyzer<DependencyInfo> {
  readonly name = 'DependencyExtractor';

  private packageFilePatterns = [
    { name: 'package.json', type: 'npm', pattern: /package\.json/gi },
    { name: 'requirements.txt', type: 'pip', pattern: /requirements\.txt/gi },
    { name: 'setup.py', type: 'pip', pattern: /setup\.py/gi },
    { name: 'pyproject.toml', type: 'pip', pattern: /pyproject\.toml/gi },
    { name: 'Cargo.toml', type: 'cargo', pattern: /Cargo\.toml/gi },
    { name: 'go.mod', type: 'go', pattern: /go\.mod/gi },
    { name: 'pom.xml', type: 'maven', pattern: /pom\.xml/gi },
    { name: 'build.gradle', type: 'gradle', pattern: /build\.gradle/gi },
    { name: 'composer.json', type: 'composer', pattern: /composer\.json/gi },
    { name: 'Gemfile', type: 'gem', pattern: /Gemfile/gi }
  ];

  private dependencyPatterns = [
    // npm/yarn dependencies
    { pattern: /"([^"]+)"\s*:\s*"([^"]+)"/g, type: 'npm' },
    // pip requirements
    { pattern: /^([a-zA-Z0-9-_]+)([>=<~!]+[0-9.]+)?$/gm, type: 'pip' },
    // cargo dependencies
    { pattern: /([a-zA-Z0-9-_]+)\s*=\s*"([^"]+)"/g, type: 'cargo' }
  ];

  async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult<DependencyInfo>> {
    try {
      const sources: string[] = [];
      const dependencyInfo = this.extractDependencies(ast, content, sources);
      const confidence = this.calculateDependencyConfidence(dependencyInfo);
      
      return this.createSuccessResult(dependencyInfo, confidence, sources);
    } catch (error) {
      const parseError = this.createError(
        'DEPENDENCY_EXTRACTION_ERROR',
        `Failed to extract dependencies: ${(error as Error).message}`,
        'error'
      );
      return this.createErrorResult(parseError);
    }
  }

  private extractDependencies(ast: MarkdownAST, content: string, sources: string[]): DependencyInfo {
    const dependencyInfo: DependencyInfo = {
      packageFiles: [],
      installCommands: [],
      packages: [],
      dependencies: [],
      devDependencies: []
    };

    // Extract package files mentioned
    if (this.extractPackageFiles(content, dependencyInfo)) {
      sources.push('package-files');
    }
    
    // Extract dependencies from code blocks
    if (this.extractFromCodeBlocks(ast, dependencyInfo)) {
      sources.push('code-blocks');
    }
    
    // Extract dependencies from install commands
    if (this.extractFromInstallCommands(content, dependencyInfo)) {
      sources.push('install-commands');
    }
    
    // Extract package mentions from text content
    if (this.extractPackageMentions(content, dependencyInfo)) {
      sources.push('package-mentions');
    }

    return dependencyInfo;
  }

  private extractPackageFiles(content: string, dependencyInfo: DependencyInfo): boolean {
    let found = false;
    for (const packageFile of this.packageFilePatterns) {
      const matches = content.match(packageFile.pattern);
      if (matches) {
        const exists = dependencyInfo.packageFiles.some(pf => pf.name === packageFile.name);
        if (!exists) {
          dependencyInfo.packageFiles.push({
            name: packageFile.name,
            type: packageFile.type as PackageManagerType,
            mentioned: true,
            confidence: 0.9
          });
          found = true;
        }
      }
    }
    return found;
  }

  private extractFromCodeBlocks(ast: MarkdownAST, dependencyInfo: DependencyInfo): boolean {
    let found = false;
    
    // Find all code blocks in the AST
    const codeBlocks = MarkdownUtils.findCodeBlocks(ast);
    
    for (const node of codeBlocks) {
      const codeValue = MarkdownUtils.getCodeValue(node);
      if (codeValue) {
        const lang = ('lang' in node && typeof node.lang === 'string') ? node.lang.toLowerCase() : '';
        
        // Extract install commands from bash/shell code blocks
        if (lang === 'bash' || lang === 'shell' || lang === 'sh' || lang === '') {
          if (this.extractInstallCommandsFromCode(codeValue, dependencyInfo)) {
            found = true;
          }
        }
        
        // JSON code blocks (likely package.json)
        if (lang === 'json' || lang === 'javascript') {
          if (this.extractFromJSON(codeValue, dependencyInfo)) {
            found = true;
          }
        }
        
        // TOML code blocks (likely Cargo.toml)
        if (lang === 'toml') {
          if (this.extractFromTOML(codeValue, dependencyInfo)) {
            found = true;
          }
        }
        
        // Requirements format
        if (lang === 'txt' || lang === 'requirements') {
          if (this.extractFromRequirements(codeValue, dependencyInfo)) {
            found = true;
          }
        }
      }
    }
    return found;
  }

  private extractFromJSON(jsonContent: string, dependencyInfo: DependencyInfo): boolean {
    try {
      const parsed = JSON.parse(jsonContent);
      
      if (parsed.dependencies) {
        for (const [name, version] of Object.entries(parsed.dependencies)) {
          this.addDependency(dependencyInfo.dependencies, {
            name,
            version: version as string,
            type: 'production',
            manager: 'npm',
            confidence: 0.9,
            source: 'package.json'
          });
        }
      }
      
      if (parsed.devDependencies) {
        for (const [name, version] of Object.entries(parsed.devDependencies)) {
          this.addDependency(dependencyInfo.devDependencies, {
            name,
            version: version as string,
            type: 'development',
            manager: 'npm',
            confidence: 0.9,
            source: 'package.json'
          });
        }
      }
      return true;
    } catch {
      // Not valid JSON, try to extract patterns
      return this.extractDependencyPatterns(jsonContent, dependencyInfo, 'npm');
    }
  }

  private extractFromTOML(tomlContent: string, dependencyInfo: DependencyInfo): boolean {
    let found = false;
    // Simple TOML parsing for dependencies section
    const dependenciesSection = tomlContent.match(/\[dependencies\]([\s\S]*?)(?=\[|$)/);
    if (dependenciesSection && dependenciesSection[1]) {
      if (this.extractDependencyPatterns(dependenciesSection[1], dependencyInfo, 'cargo')) {
        found = true;
      }
    }
    
    const devDependenciesSection = tomlContent.match(/\[dev-dependencies\]([\s\S]*?)(?=\[|$)/);
    if (devDependenciesSection && devDependenciesSection[1]) {
      if (this.extractDependencyPatterns(devDependenciesSection[1], dependencyInfo, 'cargo', true)) {
        found = true;
      }
    }
    return found;
  }

  private extractFromRequirements(requirementsContent: string, dependencyInfo: DependencyInfo): boolean {
    const lines = requirementsContent.split('\n');
    let found = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([a-zA-Z0-9-_]+)([>=<~!]+[0-9.]+)?/);
        if (match) {
          if (match[1]) {
            this.addDependency(dependencyInfo.dependencies, {
              name: match[1],
              version: match[2],
              type: 'production',
              manager: 'pip',
              confidence: 0.8,
              source: 'requirements.txt'
            });
            found = true;
          }
        }
      }
    }
    return found;
  }

  private extractDependencyPatterns(content: string, dependencyInfo: DependencyInfo, type: string, isDev = false): boolean {
    const targetArray = isDev ? dependencyInfo.devDependencies : dependencyInfo.dependencies;
    let found = false;
    
    for (const pattern of this.dependencyPatterns) {
      if (pattern.type === type) {
        let match;
        while ((match = pattern.pattern.exec(content)) !== null) {
          if (match[1]) {
            this.addDependency(targetArray, {
              name: match[1],
              version: match[2],
              type: isDev ? 'development' : 'production',
              manager: type as PackageManagerType,
              confidence: 0.7,
              source: `${type} pattern`
            });
            found = true;
          }
        }
        pattern.pattern.lastIndex = 0; // Reset regex state
      }
    }
    return found;
  }

  private extractInstallCommandsFromCode(codeContent: string, dependencyInfo: DependencyInfo): boolean {
    const lines = codeContent.split('\n');
    let found = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Extract various install commands
      const installPatterns = [
        // npm commands
        { pattern: /^(npm\s+(?:install|i|ci)(?:\s+.+)?)/i, manager: 'npm' as PackageManagerType },
        // yarn commands  
        { pattern: /^(yarn\s+(?:add|install)(?:\s+.+)?)/i, manager: 'yarn' as PackageManagerType },
        // pip commands
        { pattern: /^(pip\s+install(?:\s+.+)?)/i, manager: 'pip' as PackageManagerType },
        { pattern: /^(pip3\s+install(?:\s+.+)?)/i, manager: 'pip' as PackageManagerType },
        { pattern: /^(python\s+-m\s+pip\s+install(?:\s+.+)?)/i, manager: 'pip' as PackageManagerType },
        // cargo commands
        { pattern: /^(cargo\s+(?:add|install|build)(?:\s+.+)?)/i, manager: 'cargo' as PackageManagerType },
        // go commands
        { pattern: /^(go\s+(?:get|install|mod\s+(?:tidy|download))(?:\s+.+)?)/i, manager: 'go' as PackageManagerType },
        // java commands
        { pattern: /^(mvn\s+(?:install|compile)(?:\s+.+)?)/i, manager: 'maven' as PackageManagerType },
        { pattern: /^(gradle\s+(?:build|install)(?:\s+.+)?)/i, manager: 'gradle' as PackageManagerType },
        { pattern: /^(\.\/gradlew\s+(?:build|install)(?:\s+.+)?)/i, manager: 'gradle' as PackageManagerType },
        // php/ruby commands
        { pattern: /^(composer\s+(?:install|require)(?:\s+.+)?)/i, manager: 'composer' as PackageManagerType },
        { pattern: /^(gem\s+install(?:\s+.+)?)/i, manager: 'gem' as PackageManagerType },
        { pattern: /^(bundle\s+install(?:\s+.+)?)/i, manager: 'bundler' as PackageManagerType }
      ];
      
      for (const { pattern, manager } of installPatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          const command = match[1].trim();
          
          // Check if this command already exists to avoid duplicates
          const exists = dependencyInfo.installCommands.some(cmd => cmd.command === command);
          if (!exists) {
            // Add to install commands
            dependencyInfo.installCommands.push({
              command,
              confidence: 0.9,
              context: 'code-block'
            });
            
            // Extract package names from the command
            this.extractPackagesFromCommand(command, manager, dependencyInfo);
            found = true;
          }
          break;
        }
      }
    }
    return found;
  }

  private extractPackagesFromCommand(command: string, manager: PackageManagerType, dependencyInfo: DependencyInfo): void {
    // Extract package names from install commands
    const packagePatterns = [
      // npm install package1 package2
      { pattern: /npm\s+(?:install|i)\s+(.+)/i, manager: 'npm' },
      // yarn add package1 package2
      { pattern: /yarn\s+add\s+(.+)/i, manager: 'yarn' },
      // pip install package1 package2
      { pattern: /pip(?:3)?\s+install\s+(.+)/i, manager: 'pip' },
      { pattern: /python\s+-m\s+pip\s+install\s+(.+)/i, manager: 'pip' },
      // cargo add/install package1
      { pattern: /cargo\s+(?:add|install)\s+(.+)/i, manager: 'cargo' },
      // go get/install package1
      { pattern: /go\s+(?:get|install)\s+(.+)/i, manager: 'go' },
      // composer require package1
      { pattern: /composer\s+require\s+(.+)/i, manager: 'composer' },
      // gem install package1
      { pattern: /gem\s+install\s+(.+)/i, manager: 'gem' }
    ];
    
    for (const { pattern, manager: patternManager } of packagePatterns) {
      if (manager === patternManager || (manager === 'bundler' && patternManager === 'gem')) {
        const match = command.match(pattern);
        if (match && match[1]) {
          const packageString = match[1].trim();
          // Split by spaces and filter out flags
          const packages = packageString.split(/\s+/).filter(pkg => 
            pkg && !pkg.startsWith('-') && !pkg.startsWith('--') && pkg !== 'install'
          );
          
          for (const packageName of packages) {
            if (packageName && !this.isCommonFalsePositive(packageName)) {
              // Check for duplicates
              const exists = dependencyInfo.packages.some(pkg => 
                pkg.name === packageName && pkg.manager === manager
              );
              
              if (!exists) {
                dependencyInfo.packages.push({
                  name: packageName,
                  manager: manager,
                  confidence: 0.8
                });
              }
            }
          }
        }
        break;
      }
    }
  }

  private isCommonFalsePositive(packageName: string): boolean {
    const falsePositives = [
      'install', 'build', 'test', 'requirements', 'setup',
      'run', 'start', 'dev', 'prod', 'production', 'development',
      'config', 'configure', 'init', 'create', 'new', 'add',
      'remove', 'delete', 'update', 'upgrade', 'clean'
    ];
    return falsePositives.includes(packageName.toLowerCase());
  }

  private extractFromInstallCommands(content: string, dependencyInfo: DependencyInfo): boolean {
    // This method now focuses on extracting from general text content (not code blocks)
    const installPatterns = [
      /npm install\s+([a-zA-Z0-9@/-]+)/g,
      /yarn add\s+([a-zA-Z0-9@/-]+)/g,
      /pip install\s+([a-zA-Z0-9-_]+)/g,
      /cargo add\s+([a-zA-Z0-9-_]+)/g
    ];

    let found = false;
    for (const pattern of installPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const packageName = match[1];
        const source = match[0].startsWith('npm') ? 'npm install' :
                      match[0].startsWith('yarn') ? 'yarn add' :
                      match[0].startsWith('pip') ? 'pip install' : 'cargo add';
        
        if (packageName) {
          this.addDependency(dependencyInfo.dependencies, {
            name: packageName,
            type: 'production',
            manager: this.inferManagerFromSource(source),
            confidence: 0.6,
            source
          });
          found = true;
        }
      }
      pattern.lastIndex = 0; // Reset regex state
    }
    return found;
  }

  private inferManagerFromSource(source: string): PackageManagerType {
    if (source.includes('npm')) return 'npm';
    if (source.includes('yarn')) return 'yarn';
    if (source.includes('pip')) return 'pip';
    if (source.includes('cargo')) return 'cargo';
    return 'other';
  }

  private addDependency(targetArray: Dependency[], dependency: Dependency): void {
    // Avoid duplicates
    const exists = targetArray.some(existing => 
      existing.name === dependency.name && existing.source === dependency.source
    );
    
    if (!exists) {
      targetArray.push(dependency);
    }
  }



  private extractPackageMentions(content: string, dependencyInfo: DependencyInfo): boolean {
    let found = false;
    
    // Patterns to detect package mentions in text
    const mentionPatterns = [
      // "Dependencies include express and lodash packages"
      /dependencies\s+include\s+([^.]+?)\s+packages?/gi,
      // "Uses express, lodash, and react packages"
      /uses?\s+([^.]+?)\s+(?:packages?|libraries?|modules?)/gi,
      // "Built with express and lodash"
      /built\s+with\s+([^.]+?)(?:\s+(?:packages?|libraries?|modules?))?/gi,
      // "Requires express, lodash"
      /requires?\s+([^.]+?)(?:\s+(?:packages?|libraries?|modules?))?/gi
    ];
    
    for (const pattern of mentionPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          const packageString = match[1].trim();
          // Extract individual package names from the string
          const packages = this.parsePackageList(packageString);
          
          for (const packageName of packages) {
            if (packageName && !this.isCommonFalsePositive(packageName)) {
              // Try to infer the package manager from context or use 'other'
              const manager = this.inferManagerFromContext(content, packageName);
              
              // Check for duplicates - but allow different sources
              const exists = dependencyInfo.packages.some(pkg => 
                pkg.name === packageName && pkg.manager === manager
              );
              
              if (!exists) {
                dependencyInfo.packages.push({
                  name: packageName,
                  manager: manager,
                  confidence: 0.6
                });
              }
              found = true; // Mark as found even if duplicate exists
            }
          }
        }
      }
      pattern.lastIndex = 0; // Reset regex state
    }
    
    return found;
  }

  private parsePackageList(packageString: string): string[] {
    // Split by common delimiters and clean up
    return packageString
      .split(/[,\s]+(?:and\s+)?|(?:\s+and\s+)/)
      .map(pkg => pkg.trim())
      .filter(pkg => pkg && pkg.length > 1 && !['and', 'or', 'with'].includes(pkg.toLowerCase()));
  }

  private inferManagerFromContext(content: string, packageName: string): PackageManagerType {
    // Look for context clues to determine the package manager
    const lowerContent = content.toLowerCase();
    
    // Check for npm/node context
    if (lowerContent.includes('npm') || lowerContent.includes('node') || lowerContent.includes('javascript')) {
      return 'npm';
    }
    
    // Check for python context
    if (lowerContent.includes('pip') || lowerContent.includes('python')) {
      return 'pip';
    }
    
    // Check for rust context
    if (lowerContent.includes('cargo') || lowerContent.includes('rust')) {
      return 'cargo';
    }
    
    // Check for go context
    if (lowerContent.includes('go ') || lowerContent.includes('golang')) {
      return 'go';
    }
    
    // Default to 'other' if we can't determine
    return 'other';
  }

  private calculateDependencyConfidence(dependencyInfo: DependencyInfo): number {
    let confidence = 0;
    
    // Package files boost confidence significantly
    confidence += dependencyInfo.packageFiles.length * 0.3;
    
    // Install commands boost confidence significantly
    confidence += Math.min(dependencyInfo.installCommands.length * 0.2, 0.5);
    
    // Packages found boost confidence
    confidence += Math.min(dependencyInfo.packages.length * 0.1, 0.3);
    
    // Dependencies found boost confidence
    const totalDeps = dependencyInfo.dependencies.length + dependencyInfo.devDependencies.length;
    confidence += Math.min(totalDeps * 0.1, 0.4);
    
    // Having both runtime and dev dependencies is a good sign
    if (dependencyInfo.dependencies.length > 0 && dependencyInfo.devDependencies.length > 0) {
      confidence += 0.15;
    }
    
    // Base confidence if we found anything at all
    const hasAnyInfo = dependencyInfo.packageFiles.length > 0 || 
                      dependencyInfo.installCommands.length > 0 || 
                      dependencyInfo.packages.length > 0 || 
                      totalDeps > 0;
    
    if (hasAnyInfo) {
      confidence = Math.max(confidence, 0.4); // Minimum confidence when we find something
    }
    
    // Boost confidence if we have both package files and install commands
    if (dependencyInfo.packageFiles.length > 0 && dependencyInfo.installCommands.length > 0) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }
}