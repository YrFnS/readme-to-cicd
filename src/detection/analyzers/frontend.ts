import { BaseLanguageAnalyzer } from './base';
import { LanguageDetectionResult, ProjectInfo } from '../interfaces/language-analyzer';
import { FrameworkInfo, BuildToolInfo } from '../interfaces/framework-info';
import { CIStep } from '../interfaces/ci-pipeline';
import { Evidence } from '../interfaces/evidence';
import { FileSystemScanner } from '../utils/file-scanner';
import { join } from 'path';

/**
 * Frontend tooling and build system analyzer
 */
export class FrontendAnalyzer extends BaseLanguageAnalyzer {
  readonly name = 'Frontend Analyzer';
  readonly ecosystem = 'frontend';

  private fileScanner = new FileSystemScanner();

  canAnalyze(projectInfo: ProjectInfo): boolean {
    // Check for frontend build tools and frameworks
    return this.hasWebpackConfig(projectInfo) ||
           this.hasViteConfig(projectInfo) ||
           this.hasParcelConfig(projectInfo) ||
           this.hasRollupConfig(projectInfo) ||
           this.hasStaticSiteGenerator(projectInfo) ||
           this.hasDeploymentPlatform(projectInfo) ||
           this.hasFrontendDependencies(projectInfo);
  }

  async analyze(projectInfo: ProjectInfo, projectPath?: string): Promise<LanguageDetectionResult> {
    const startTime = Date.now();
    const frameworks: FrameworkInfo[] = [];
    const buildTools: BuildToolInfo[] = [];
    const warnings: string[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Detect build tools
    try {
      const webpackInfo = await this.detectWebpack(projectInfo, projectPath);
      if (webpackInfo) {
        buildTools.push(webpackInfo.buildTool);
        filesAnalyzed.push(...webpackInfo.filesAnalyzed);
        patternsMatched.push(...webpackInfo.patternsMatched);
      }
    } catch (error) {
      warnings.push(`Webpack detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      const viteInfo = await this.detectVite(projectInfo, projectPath);
      if (viteInfo) {
        buildTools.push(viteInfo.buildTool);
        filesAnalyzed.push(...viteInfo.filesAnalyzed);
        patternsMatched.push(...viteInfo.patternsMatched);
      }
    } catch (error) {
      warnings.push(`Vite detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      const parcelInfo = await this.detectParcel(projectInfo, projectPath);
      if (parcelInfo) {
        buildTools.push(parcelInfo.buildTool);
        filesAnalyzed.push(...parcelInfo.filesAnalyzed);
        patternsMatched.push(...parcelInfo.patternsMatched);
      }
    } catch (error) {
      warnings.push(`Parcel detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      const rollupInfo = await this.detectRollup(projectInfo, projectPath);
      if (rollupInfo) {
        buildTools.push(rollupInfo.buildTool);
        filesAnalyzed.push(...rollupInfo.filesAnalyzed);
        patternsMatched.push(...rollupInfo.patternsMatched);
      }
    } catch (error) {
      warnings.push(`Rollup detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Detect static site generators
    try {
      const ssgInfo = await this.detectStaticSiteGenerators(projectInfo, projectPath);
      if (ssgInfo.length > 0) {
        frameworks.push(...ssgInfo.map(info => info.framework));
        filesAnalyzed.push(...ssgInfo.flatMap(info => info.filesAnalyzed));
        patternsMatched.push(...ssgInfo.flatMap(info => info.patternsMatched));
      }
    } catch (error) {
      warnings.push(`Static site generator detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Detect deployment platforms
    try {
      const deploymentInfo = await this.detectDeploymentPlatforms(projectInfo, projectPath);
      if (deploymentInfo.length > 0) {
        frameworks.push(...deploymentInfo.map(info => info.framework));
        filesAnalyzed.push(...deploymentInfo.flatMap(info => info.filesAnalyzed));
        patternsMatched.push(...deploymentInfo.flatMap(info => info.patternsMatched));
      }
    } catch (error) {
      warnings.push(`Deployment platform detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      frameworks,
      buildTools,
      confidence: this.calculateOverallConfidence(frameworks, buildTools),
      recommendations: this.generateRecommendations(frameworks, buildTools, warnings),
      metadata: {
        executionTime: Date.now() - startTime,
        filesAnalyzed: [...new Set(filesAnalyzed)],
        patternsMatched: [...new Set(patternsMatched)],
        warnings
      }
    };
  }  
/**
   * Detect Webpack configuration
   */
  private async detectWebpack(projectInfo: ProjectInfo, projectPath?: string): Promise<FrontendDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for webpack config files
    const webpackConfigs = [
      'webpack.config.js', 'webpack.config.ts', 'webpack.config.mjs',
      'webpack.dev.js', 'webpack.prod.js', 'webpack.common.js'
    ];

    let configFile: string | null = null;
    for (const config of webpackConfigs) {
      if (this.hasConfigFile(projectInfo, config)) {
        configFile = config;
        evidence.push({
          type: 'config_file',
          source: config,
          value: `${config} found`,
          weight: 0.9
        });
        patternsMatched.push(config);
        break;
      }
    }

    // Check for webpack dependencies
    if (this.hasDependency(projectInfo, 'webpack')) {
      evidence.push({
        type: 'dependency',
        source: 'package.json',
        value: 'webpack dependency',
        weight: 0.8
      });
      patternsMatched.push('webpack dependency');
    }

    if (this.hasDependency(projectInfo, 'webpack-cli')) {
      evidence.push({
        type: 'dependency',
        source: 'package.json',
        value: 'webpack-cli dependency',
        weight: 0.7
      });
      patternsMatched.push('webpack-cli dependency');
    }

    if (this.hasDependency(projectInfo, 'webpack-dev-server')) {
      evidence.push({
        type: 'dependency',
        source: 'package.json',
        value: 'webpack-dev-server dependency',
        weight: 0.6
      });
      patternsMatched.push('webpack-dev-server dependency');
    }

    // Check for webpack commands
    if (this.hasCommand(projectInfo, 'webpack')) {
      evidence.push({
        type: 'command_pattern',
        source: 'build commands',
        value: 'webpack command',
        weight: 0.7
      });
      patternsMatched.push('webpack command');
    }

    // Parse webpack config if available
    let webpackInfo: WebpackInfo | null = null;
    if (projectPath && configFile) {
      try {
        webpackInfo = await this.parseWebpackConfig(join(projectPath, configFile));
        filesAnalyzed.push(configFile);
      } catch (error) {
        evidence.push({
          type: 'config_file',
          source: configFile,
          value: 'Webpack config found but could not be parsed',
          weight: 0.3
        });
      }
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const buildTool: BuildToolInfo = {
      name: 'Webpack',
      configFile: configFile || 'webpack.config.js',
      commands: [
        {
          name: 'build',
          command: 'webpack --mode production',
          description: 'Build for production',
          isPrimary: true
        },
        {
          name: 'dev',
          command: 'webpack serve --mode development',
          description: 'Start development server',
          isPrimary: false
        },
        {
          name: 'watch',
          command: 'webpack --watch',
          description: 'Watch for changes',
          isPrimary: false
        }
      ],
      confidence,
      config: webpackInfo || {}
    };

    return {
      buildTool,
      filesAnalyzed,
      patternsMatched
    };
  }

  /**
   * Detect Vite configuration
   */
  private async detectVite(projectInfo: ProjectInfo, projectPath?: string): Promise<FrontendDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for vite config files
    const viteConfigs = [
      'vite.config.js', 'vite.config.ts', 'vite.config.mjs',
      'vitest.config.js', 'vitest.config.ts'
    ];

    let configFile: string | null = null;
    for (const config of viteConfigs) {
      if (this.hasConfigFile(projectInfo, config)) {
        configFile = config;
        evidence.push({
          type: 'config_file',
          source: config,
          value: `${config} found`,
          weight: 0.9
        });
        patternsMatched.push(config);
        break;
      }
    }

    // Check for vite dependencies
    if (this.hasDependency(projectInfo, 'vite')) {
      evidence.push({
        type: 'dependency',
        source: 'package.json',
        value: 'vite dependency',
        weight: 0.85
      });
      patternsMatched.push('vite dependency');
    }

    if (this.hasDependency(projectInfo, '@vitejs/')) {
      evidence.push({
        type: 'dependency',
        source: 'package.json',
        value: 'vite plugin dependency',
        weight: 0.7
      });
      patternsMatched.push('vite plugin dependency');
    }

    // Check for vite commands
    if (this.hasCommand(projectInfo, 'vite')) {
      evidence.push({
        type: 'command_pattern',
        source: 'build commands',
        value: 'vite command',
        weight: 0.8
      });
      patternsMatched.push('vite command');
    }

    // Parse vite config if available
    let viteInfo: ViteInfo | null = null;
    if (projectPath && configFile) {
      try {
        viteInfo = await this.parseViteConfig(join(projectPath, configFile));
        filesAnalyzed.push(configFile);
      } catch (error) {
        evidence.push({
          type: 'config_file',
          source: configFile,
          value: 'Vite config found but could not be parsed',
          weight: 0.3
        });
      }
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const buildTool: BuildToolInfo = {
      name: 'Vite',
      configFile: configFile || 'vite.config.js',
      commands: [
        {
          name: 'build',
          command: 'vite build',
          description: 'Build for production',
          isPrimary: true
        },
        {
          name: 'dev',
          command: 'vite dev',
          description: 'Start development server',
          isPrimary: false
        },
        {
          name: 'preview',
          command: 'vite preview',
          description: 'Preview production build',
          isPrimary: false
        }
      ],
      confidence,
      config: viteInfo || {}
    };

    return {
      buildTool,
      filesAnalyzed,
      patternsMatched
    };
  }  /*
*
   * Detect Parcel configuration
   */
  private async detectParcel(projectInfo: ProjectInfo, _projectPath?: string): Promise<FrontendDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for parcel config files
    const parcelConfigs = [
      '.parcelrc', '.parcelrc.json', 'parcel.config.js'
    ];

    let configFile: string | null = null;
    for (const config of parcelConfigs) {
      if (this.hasConfigFile(projectInfo, config)) {
        configFile = config;
        evidence.push({
          type: 'config_file',
          source: config,
          value: `${config} found`,
          weight: 0.9
        });
        patternsMatched.push(config);
        break;
      }
    }

    // Check for parcel dependencies
    if (this.hasDependency(projectInfo, 'parcel')) {
      evidence.push({
        type: 'dependency',
        source: 'package.json',
        value: 'parcel dependency',
        weight: 0.85
      });
      patternsMatched.push('parcel dependency');
    }

    if (this.hasDependency(projectInfo, '@parcel/')) {
      evidence.push({
        type: 'dependency',
        source: 'package.json',
        value: 'parcel plugin dependency',
        weight: 0.7
      });
      patternsMatched.push('parcel plugin dependency');
    }

    // Check for parcel commands
    if (this.hasCommand(projectInfo, 'parcel')) {
      evidence.push({
        type: 'command_pattern',
        source: 'build commands',
        value: 'parcel command',
        weight: 0.8
      });
      patternsMatched.push('parcel command');
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const buildTool: BuildToolInfo = {
      name: 'Parcel',
      configFile: configFile || '.parcelrc',
      commands: [
        {
          name: 'build',
          command: 'parcel build src/index.html',
          description: 'Build for production',
          isPrimary: true
        },
        {
          name: 'dev',
          command: 'parcel src/index.html',
          description: 'Start development server',
          isPrimary: false
        }
      ],
      confidence,
      config: {}
    };

    return {
      buildTool,
      filesAnalyzed,
      patternsMatched
    };
  }

  /**
   * Detect Rollup configuration
   */
  private async detectRollup(projectInfo: ProjectInfo, _projectPath?: string): Promise<FrontendDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for rollup config files
    const rollupConfigs = [
      'rollup.config.js', 'rollup.config.ts', 'rollup.config.mjs'
    ];

    let configFile: string | null = null;
    for (const config of rollupConfigs) {
      if (this.hasConfigFile(projectInfo, config)) {
        configFile = config;
        evidence.push({
          type: 'config_file',
          source: config,
          value: `${config} found`,
          weight: 0.9
        });
        patternsMatched.push(config);
        break;
      }
    }

    // Check for rollup dependencies
    if (this.hasDependency(projectInfo, 'rollup')) {
      evidence.push({
        type: 'dependency',
        source: 'package.json',
        value: 'rollup dependency',
        weight: 0.85
      });
      patternsMatched.push('rollup dependency');
    }

    if (this.hasDependency(projectInfo, '@rollup/')) {
      evidence.push({
        type: 'dependency',
        source: 'package.json',
        value: 'rollup plugin dependency',
        weight: 0.7
      });
      patternsMatched.push('rollup plugin dependency');
    }

    // Check for rollup commands
    if (this.hasCommand(projectInfo, 'rollup')) {
      evidence.push({
        type: 'command_pattern',
        source: 'build commands',
        value: 'rollup command',
        weight: 0.8
      });
      patternsMatched.push('rollup command');
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const buildTool: BuildToolInfo = {
      name: 'Rollup',
      configFile: configFile || 'rollup.config.js',
      commands: [
        {
          name: 'build',
          command: 'rollup -c',
          description: 'Build with config',
          isPrimary: true
        },
        {
          name: 'watch',
          command: 'rollup -c --watch',
          description: 'Watch for changes',
          isPrimary: false
        }
      ],
      confidence,
      config: {}
    };

    return {
      buildTool,
      filesAnalyzed,
      patternsMatched
    };
  }  
/**
   * Detect static site generators
   */
  private async detectStaticSiteGenerators(projectInfo: ProjectInfo, projectPath?: string): Promise<StaticSiteDetectionResult[]> {
    const results: StaticSiteDetectionResult[] = [];

    // Detect Gatsby
    const gatsbyResult = await this.detectGatsby(projectInfo, projectPath);
    if (gatsbyResult) results.push(gatsbyResult);

    // Detect Next.js
    const nextResult = await this.detectNextJS(projectInfo, projectPath);
    if (nextResult) results.push(nextResult);

    // Detect Nuxt.js
    const nuxtResult = await this.detectNuxtJS(projectInfo, projectPath);
    if (nuxtResult) results.push(nuxtResult);

    // Detect Jekyll
    const jekyllResult = await this.detectJekyll(projectInfo, projectPath);
    if (jekyllResult) results.push(jekyllResult);

    return results;
  }

  /**
   * Detect Gatsby
   */
  private async detectGatsby(projectInfo: ProjectInfo, _projectPath?: string): Promise<StaticSiteDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for gatsby config
    if (this.hasConfigFile(projectInfo, 'gatsby-config.js') || this.hasConfigFile(projectInfo, 'gatsby-config.ts')) {
      const configFile = this.hasConfigFile(projectInfo, 'gatsby-config.ts') ? 'gatsby-config.ts' : 'gatsby-config.js';
      evidence.push({
        type: 'config_file',
        source: configFile,
        value: `${configFile} found`,
        weight: 0.95
      });
      patternsMatched.push(configFile);
      filesAnalyzed.push(configFile);
    }

    // Check for gatsby dependencies
    if (this.hasDependency(projectInfo, 'gatsby')) {
      evidence.push({
        type: 'dependency',
        source: 'package.json',
        value: 'gatsby dependency',
        weight: 0.9
      });
      patternsMatched.push('gatsby dependency');
    }

    // Check for gatsby commands
    if (this.hasCommand(projectInfo, 'gatsby')) {
      evidence.push({
        type: 'command_pattern',
        source: 'build commands',
        value: 'gatsby command',
        weight: 0.8
      });
      patternsMatched.push('gatsby command');
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const framework = this.createFrameworkInfo(
      'Gatsby',
      'static_site_generator',
      confidence,
      evidence
    );

    framework.deploymentTarget = ['netlify', 'vercel', 'github-pages'];

    return {
      framework,
      filesAnalyzed,
      patternsMatched
    };
  }

  /**
   * Detect Next.js
   */
  private async detectNextJS(projectInfo: ProjectInfo, _projectPath?: string): Promise<StaticSiteDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for next config
    const nextConfigs = ['next.config.js', 'next.config.ts', 'next.config.mjs'];
    
    for (const config of nextConfigs) {
      if (this.hasConfigFile(projectInfo, config)) {
        evidence.push({
          type: 'config_file',
          source: config,
          value: `${config} found`,
          weight: 0.9
        });
        patternsMatched.push(config);
        filesAnalyzed.push(config);
        break;
      }
    }

    // Check for next dependencies
    if (this.hasDependency(projectInfo, 'next')) {
      evidence.push({
        type: 'dependency',
        source: 'package.json',
        value: 'next dependency',
        weight: 0.95
      });
      patternsMatched.push('next dependency');
    }

    // Check for next commands
    if (this.hasCommand(projectInfo, 'next')) {
      evidence.push({
        type: 'command_pattern',
        source: 'build commands',
        value: 'next command',
        weight: 0.8
      });
      patternsMatched.push('next command');
    }

    // Check for pages directory
    if (projectInfo.configFiles.some(file => file.includes('pages/') || file.includes('app/'))) {
      evidence.push({
        type: 'directory_structure',
        source: 'project structure',
        value: 'Next.js directory structure',
        weight: 0.7
      });
      patternsMatched.push('next.js directory structure');
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const framework = this.createFrameworkInfo(
      'Next.js',
      'fullstack_framework',
      confidence,
      evidence
    );

    framework.deploymentTarget = ['vercel', 'netlify', 'aws'];

    return {
      framework,
      filesAnalyzed,
      patternsMatched
    };
  }

  /**
   * Detect Nuxt.js
   */
  private async detectNuxtJS(projectInfo: ProjectInfo, _projectPath?: string): Promise<StaticSiteDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for nuxt config
    const nuxtConfigs = ['nuxt.config.js', 'nuxt.config.ts'];
    
    for (const config of nuxtConfigs) {
      if (this.hasConfigFile(projectInfo, config)) {
        evidence.push({
          type: 'config_file',
          source: config,
          value: `${config} found`,
          weight: 0.95
        });
        patternsMatched.push(config);
        filesAnalyzed.push(config);
        break;
      }
    }

    // Check for nuxt dependencies
    if (this.hasDependency(projectInfo, 'nuxt')) {
      evidence.push({
        type: 'dependency',
        source: 'package.json',
        value: 'nuxt dependency',
        weight: 0.9
      });
      patternsMatched.push('nuxt dependency');
    }

    // Check for nuxt commands
    if (this.hasCommand(projectInfo, 'nuxt')) {
      evidence.push({
        type: 'command_pattern',
        source: 'build commands',
        value: 'nuxt command',
        weight: 0.8
      });
      patternsMatched.push('nuxt command');
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const framework = this.createFrameworkInfo(
      'Nuxt.js',
      'fullstack_framework',
      confidence,
      evidence
    );

    framework.deploymentTarget = ['netlify', 'vercel', 'aws'];

    return {
      framework,
      filesAnalyzed,
      patternsMatched
    };
  }

  /**
   * Detect Jekyll
   */
  private async detectJekyll(projectInfo: ProjectInfo, _projectPath?: string): Promise<StaticSiteDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for Jekyll config
    if (this.hasConfigFile(projectInfo, '_config.yml')) {
      evidence.push({
        type: 'config_file',
        source: '_config.yml',
        value: '_config.yml found',
        weight: 0.95
      });
      patternsMatched.push('_config.yml');
      filesAnalyzed.push('_config.yml');
    }

    // Check for Gemfile
    if (this.hasConfigFile(projectInfo, 'Gemfile')) {
      evidence.push({
        type: 'config_file',
        source: 'Gemfile',
        value: 'Gemfile found',
        weight: 0.8
      });
      patternsMatched.push('Gemfile');
      filesAnalyzed.push('Gemfile');
    }

    // Check for jekyll commands
    if (this.hasCommand(projectInfo, 'jekyll')) {
      evidence.push({
        type: 'command_pattern',
        source: 'build commands',
        value: 'jekyll command',
        weight: 0.8
      });
      patternsMatched.push('jekyll command');
    }

    // Check for Jekyll directory structure
    if (projectInfo.configFiles.some(file => file.includes('_posts/') || file.includes('_layouts/'))) {
      evidence.push({
        type: 'directory_structure',
        source: 'project structure',
        value: 'Jekyll directory structure',
        weight: 0.7
      });
      patternsMatched.push('jekyll directory structure');
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const framework = this.createFrameworkInfo(
      'Jekyll',
      'static_site_generator',
      confidence,
      evidence
    );

    framework.deploymentTarget = ['github-pages', 'netlify', 'vercel'];

    return {
      framework,
      filesAnalyzed,
      patternsMatched
    };
  }  /**

   * Detect deployment platforms
   */
  private async detectDeploymentPlatforms(projectInfo: ProjectInfo, projectPath?: string): Promise<DeploymentDetectionResult[]> {
    const results: DeploymentDetectionResult[] = [];

    // Detect Netlify
    const netlifyResult = await this.detectNetlify(projectInfo, projectPath);
    if (netlifyResult) results.push(netlifyResult);

    // Detect Vercel
    const vercelResult = await this.detectVercel(projectInfo, projectPath);
    if (vercelResult) results.push(vercelResult);

    // Detect GitHub Pages
    const githubPagesResult = await this.detectGitHubPages(projectInfo, projectPath);
    if (githubPagesResult) results.push(githubPagesResult);

    return results;
  }

  /**
   * Detect Netlify deployment
   */
  private async detectNetlify(projectInfo: ProjectInfo, _projectPath?: string): Promise<DeploymentDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for netlify config
    if (this.hasConfigFile(projectInfo, 'netlify.toml')) {
      evidence.push({
        type: 'config_file',
        source: 'netlify.toml',
        value: 'netlify.toml found',
        weight: 0.95
      });
      patternsMatched.push('netlify.toml');
      filesAnalyzed.push('netlify.toml');
    }

    // Check for _redirects file
    if (this.hasConfigFile(projectInfo, '_redirects')) {
      evidence.push({
        type: 'config_file',
        source: '_redirects',
        value: '_redirects file found',
        weight: 0.7
      });
      patternsMatched.push('_redirects');
      filesAnalyzed.push('_redirects');
    }

    // Check for netlify functions
    if (projectInfo.configFiles.some(file => file.includes('netlify/functions/'))) {
      evidence.push({
        type: 'directory_structure',
        source: 'project structure',
        value: 'Netlify functions directory',
        weight: 0.8
      });
      patternsMatched.push('netlify functions');
    }

    // Check for netlify mentions in text
    if (projectInfo.rawContent.toLowerCase().includes('netlify')) {
      evidence.push({
        type: 'text_mention',
        source: 'README content',
        value: 'Netlify mentioned in documentation',
        weight: 0.3
      });
      patternsMatched.push('netlify mention');
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const framework = this.createFrameworkInfo(
      'Netlify',
      'build_tool',
      confidence,
      evidence
    );

    framework.metadata = {
      ...framework.metadata,
      deploymentType: 'static_hosting',
      features: ['edge_functions', 'form_handling', 'redirects']
    };

    return {
      framework,
      filesAnalyzed,
      patternsMatched
    };
  }

  /**
   * Detect Vercel deployment
   */
  private async detectVercel(projectInfo: ProjectInfo, _projectPath?: string): Promise<DeploymentDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for vercel config
    if (this.hasConfigFile(projectInfo, 'vercel.json')) {
      evidence.push({
        type: 'config_file',
        source: 'vercel.json',
        value: 'vercel.json found',
        weight: 0.95
      });
      patternsMatched.push('vercel.json');
      filesAnalyzed.push('vercel.json');
    }

    // Check for vercel CLI
    if (this.hasCommand(projectInfo, 'vercel')) {
      evidence.push({
        type: 'command_pattern',
        source: 'build commands',
        value: 'vercel command',
        weight: 0.8
      });
      patternsMatched.push('vercel command');
    }

    // Check for vercel functions
    if (projectInfo.configFiles.some(file => file.includes('api/') && (file.includes('.js') || file.includes('.ts')))) {
      evidence.push({
        type: 'directory_structure',
        source: 'project structure',
        value: 'Vercel API directory structure',
        weight: 0.7
      });
      patternsMatched.push('vercel api structure');
    }

    // Check for vercel mentions in text
    if (projectInfo.rawContent.toLowerCase().includes('vercel')) {
      evidence.push({
        type: 'text_mention',
        source: 'README content',
        value: 'Vercel mentioned in documentation',
        weight: 0.3
      });
      patternsMatched.push('vercel mention');
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const framework = this.createFrameworkInfo(
      'Vercel',
      'build_tool',
      confidence,
      evidence
    );

    framework.metadata = {
      ...framework.metadata,
      deploymentType: 'serverless',
      features: ['edge_functions', 'serverless_functions', 'analytics']
    };

    return {
      framework,
      filesAnalyzed,
      patternsMatched
    };
  }

  /**
   * Detect GitHub Pages deployment
   */
  private async detectGitHubPages(projectInfo: ProjectInfo, _projectPath?: string): Promise<DeploymentDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for GitHub Actions workflow for pages
    if (projectInfo.configFiles.some(file => file.includes('.github/workflows/') && file.includes('pages'))) {
      evidence.push({
        type: 'config_file',
        source: 'GitHub Actions workflow',
        value: 'GitHub Pages workflow found',
        weight: 0.9
      });
      patternsMatched.push('github pages workflow');
    }

    // Check for gh-pages branch mentions
    if (projectInfo.rawContent.toLowerCase().includes('gh-pages')) {
      evidence.push({
        type: 'text_mention',
        source: 'README content',
        value: 'gh-pages branch mentioned',
        weight: 0.6
      });
      patternsMatched.push('gh-pages mention');
    }

    // Check for GitHub Pages URL pattern
    if (projectInfo.rawContent.includes('.github.io')) {
      evidence.push({
        type: 'text_mention',
        source: 'README content',
        value: 'GitHub Pages URL found',
        weight: 0.8
      });
      patternsMatched.push('github.io url');
    }

    // Check for Jekyll (common with GitHub Pages)
    if (this.hasConfigFile(projectInfo, '_config.yml')) {
      evidence.push({
        type: 'config_file',
        source: '_config.yml',
        value: 'Jekyll config (GitHub Pages compatible)',
        weight: 0.5
      });
      patternsMatched.push('jekyll config');
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const framework = this.createFrameworkInfo(
      'GitHub Pages',
      'build_tool',
      confidence,
      evidence
    );

    framework.metadata = {
      ...framework.metadata,
      deploymentType: 'static_hosting',
      features: ['jekyll_support', 'custom_domains', 'https']
    };

    return {
      framework,
      filesAnalyzed,
      patternsMatched
    };
  }  /**
   
* Helper methods for detection
   */
  private hasWebpackConfig(projectInfo: ProjectInfo): boolean {
    return this.hasConfigFile(projectInfo, 'webpack.config.js') ||
           this.hasConfigFile(projectInfo, 'webpack.config.ts') ||
           this.hasDependency(projectInfo, 'webpack');
  }

  private hasViteConfig(projectInfo: ProjectInfo): boolean {
    return this.hasConfigFile(projectInfo, 'vite.config.js') ||
           this.hasConfigFile(projectInfo, 'vite.config.ts') ||
           this.hasDependency(projectInfo, 'vite');
  }

  private hasParcelConfig(projectInfo: ProjectInfo): boolean {
    return this.hasConfigFile(projectInfo, '.parcelrc') ||
           this.hasDependency(projectInfo, 'parcel');
  }

  private hasRollupConfig(projectInfo: ProjectInfo): boolean {
    return this.hasConfigFile(projectInfo, 'rollup.config.js') ||
           this.hasConfigFile(projectInfo, 'rollup.config.ts') ||
           this.hasDependency(projectInfo, 'rollup');
  }

  private hasStaticSiteGenerator(projectInfo: ProjectInfo): boolean {
    return this.hasDependency(projectInfo, 'gatsby') ||
           this.hasDependency(projectInfo, 'next') ||
           this.hasDependency(projectInfo, 'nuxt') ||
           this.hasConfigFile(projectInfo, '_config.yml') ||
           this.hasConfigFile(projectInfo, 'gatsby-config.js') ||
           this.hasConfigFile(projectInfo, 'next.config.js') ||
           this.hasConfigFile(projectInfo, 'nuxt.config.js');
  }

  private hasDeploymentPlatform(projectInfo: ProjectInfo): boolean {
    return this.hasConfigFile(projectInfo, 'netlify.toml') ||
           this.hasConfigFile(projectInfo, 'vercel.json') ||
           projectInfo.rawContent.toLowerCase().includes('netlify') ||
           projectInfo.rawContent.toLowerCase().includes('vercel') ||
           projectInfo.rawContent.includes('.github.io');
  }

  private hasFrontendDependencies(projectInfo: ProjectInfo): boolean {
    const frontendDeps = [
      'webpack', 'vite', 'parcel', 'rollup',
      'gatsby', 'next', 'nuxt',
      'react', 'vue', 'angular', 'svelte'
    ];
    
    return frontendDeps.some(dep => this.hasDependency(projectInfo, dep));
  }

  /**
   * Parse webpack configuration
   */
  private async parseWebpackConfig(configPath: string): Promise<WebpackInfo> {
    // For now, return basic info since parsing JS config files is complex
    // In a real implementation, this would use AST parsing or dynamic imports
    return {
      mode: 'production',
      entry: './src/index.js',
      hasDevServer: true
    };
  }

  /**
   * Parse vite configuration
   */
  private async parseViteConfig(configPath: string): Promise<ViteInfo> {
    // For now, return basic info since parsing JS config files is complex
    // In a real implementation, this would use AST parsing or dynamic imports
    return {
      plugins: [],
      build: {
        outDir: 'dist'
      }
    };
  }

  /**
   * Calculate evidence confidence
   */
  private calculateEvidenceConfidence(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;
    
    const totalWeight = evidence.reduce((sum, e) => sum + e.weight, 0);
    const maxPossibleWeight = evidence.length * 1.0; // Assuming max weight is 1.0
    
    return Math.min(totalWeight / maxPossibleWeight, 1.0);
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(frameworks: FrameworkInfo[], buildTools: BuildToolInfo[]): number {
    const allConfidences = [
      ...frameworks.map(f => f.confidence),
      ...buildTools.map(t => t.confidence)
    ];
    
    if (allConfidences.length === 0) return 0;
    return Math.max(...allConfidences);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(frameworks: FrameworkInfo[], buildTools: BuildToolInfo[], warnings: string[]): string[] {
    const recommendations: string[] = [];

    const hasWebpack = buildTools.some(t => t.name === 'Webpack');
    const hasVite = buildTools.some(t => t.name === 'Vite');
    const hasGatsby = frameworks.some(f => f.name === 'Gatsby');
    const hasNext = frameworks.some(f => f.name === 'Next.js');
    const hasNetlify = frameworks.some(f => f.name === 'Netlify');
    const hasVercel = frameworks.some(f => f.name === 'Vercel');

    if (hasWebpack && !hasVite) {
      recommendations.push('Consider migrating to Vite for faster development builds');
    }

    if (hasNext && !hasVercel) {
      recommendations.push('Consider deploying Next.js applications to Vercel for optimal performance');
    }

    if (hasGatsby && !hasNetlify) {
      recommendations.push('Consider deploying Gatsby sites to Netlify for seamless integration');
    }

    if (buildTools.length === 0 && frameworks.length > 0) {
      recommendations.push('Consider adding a build tool for better development experience');
    }

    if (frameworks.some(f => f.name === 'Jekyll') && !frameworks.some(f => f.name === 'GitHub Pages')) {
      recommendations.push('Consider deploying Jekyll sites to GitHub Pages for free hosting');
    }

    if (warnings.length > 0) {
      recommendations.push('Review frontend configuration warnings for potential issues');
    }

    return recommendations;
  }

  generateCISteps(/* frameworks: FrameworkInfo[] */): CIStep[] {
    // TODO: Implement CI step generation for frontend tools
    // This will be implemented in task 11
    return [];
  }
}

// Supporting interfaces
interface FrontendDetectionResult {
  buildTool: BuildToolInfo;
  filesAnalyzed: string[];
  patternsMatched: string[];
}

interface StaticSiteDetectionResult {
  framework: FrameworkInfo;
  filesAnalyzed: string[];
  patternsMatched: string[];
}

interface DeploymentDetectionResult {
  framework: FrameworkInfo;
  filesAnalyzed: string[];
  patternsMatched: string[];
}

interface WebpackInfo {
  mode?: string;
  entry?: string;
  hasDevServer?: boolean;
}

interface ViteInfo {
  plugins?: string[];
  build?: {
    outDir?: string;
  };
}