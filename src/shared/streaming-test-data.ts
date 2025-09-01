/**
 * Streaming test data generator for large fixtures
 * Replaces static large fixtures with on-demand streaming data generation
 */

import { Readable } from 'stream';

export interface StreamingDataConfig {
  /** Type of data to generate */
  type: 'readme' | 'package-json' | 'dockerfile' | 'yaml-config';
  /** Size category for the generated data */
  size: 'small' | 'medium' | 'large' | 'xlarge';
  /** Specific content patterns to include */
  patterns?: string[];
  /** Languages to include in generated content */
  languages?: string[];
  /** Frameworks to reference */
  frameworks?: string[];
  /** Maximum memory usage for generation (bytes) */
  maxMemoryUsage?: number;
}

export interface StreamingDataMetrics {
  /** Total bytes generated */
  bytesGenerated: number;
  /** Time taken to generate (ms) */
  generationTime: number;
  /** Peak memory usage during generation (bytes) */
  peakMemoryUsage: number;
  /** Number of chunks generated */
  chunksGenerated: number;
}

export interface StreamingDataChunk {
  /** Chunk content */
  content: string;
  /** Chunk index */
  index: number;
  /** Whether this is the final chunk */
  isLast: boolean;
  /** Chunk size in bytes */
  size: number;
}

/**
 * Size configurations for different data types
 */
export const STREAMING_DATA_SIZES = {
  small: {
    readme: { sections: 10, codeBlocks: 20, lines: 200, chunkSize: 1024 },
    'package-json': { dependencies: 10, scripts: 5, chunkSize: 512 },
    dockerfile: { stages: 2, commands: 20, chunkSize: 512 },
    'yaml-config': { services: 3, configs: 10, chunkSize: 512 }
  },
  medium: {
    readme: { sections: 50, codeBlocks: 100, lines: 1000, chunkSize: 2048 },
    'package-json': { dependencies: 50, scripts: 15, chunkSize: 1024 },
    dockerfile: { stages: 5, commands: 50, chunkSize: 1024 },
    'yaml-config': { services: 10, configs: 30, chunkSize: 1024 }
  },
  large: {
    readme: { sections: 200, codeBlocks: 400, lines: 4000, chunkSize: 4096 },
    'package-json': { dependencies: 200, scripts: 30, chunkSize: 2048 },
    dockerfile: { stages: 10, commands: 100, chunkSize: 2048 },
    'yaml-config': { services: 25, configs: 75, chunkSize: 2048 }
  },
  xlarge: {
    readme: { sections: 500, codeBlocks: 1000, lines: 10000, chunkSize: 8192 },
    'package-json': { dependencies: 500, scripts: 50, chunkSize: 4096 },
    dockerfile: { stages: 20, commands: 200, chunkSize: 4096 },
    'yaml-config': { services: 50, configs: 150, chunkSize: 4096 }
  }
} as const;

/**
 * Content templates for different data types
 */
export const CONTENT_TEMPLATES = {
  readme: {
    languages: [
      'javascript', 'typescript', 'python', 'go', 'rust', 'java', 'cpp', 'csharp',
      'php', 'ruby', 'swift', 'kotlin', 'scala', 'clojure', 'haskell', 'erlang'
    ],
    frameworks: [
      'React', 'Vue', 'Angular', 'Express', 'Django', 'Flask', 'Spring Boot',
      'Rails', 'Laravel', 'ASP.NET', 'Gin', 'Actix', 'Rocket', 'Axum'
    ],
    commands: [
      'npm install', 'yarn install', 'pip install', 'cargo build', 'go build',
      'mvn compile', 'gradle build', 'make', 'cmake', 'docker build'
    ],
    testCommands: [
      'npm test', 'yarn test', 'pytest', 'cargo test', 'go test',
      'mvn test', 'gradle test', 'jest', 'vitest', 'mocha'
    ]
  },
  'package-json': {
    dependencies: [
      'express', 'react', 'vue', 'angular', 'lodash', 'axios', 'moment',
      'uuid', 'bcrypt', 'jsonwebtoken', 'cors', 'helmet', 'morgan'
    ],
    devDependencies: [
      'typescript', 'jest', 'vitest', 'eslint', 'prettier', 'webpack',
      'babel', 'nodemon', 'concurrently', 'cross-env'
    ]
  }
} as const;

/**
 * Streaming README data generator
 */
export class StreamingReadmeGenerator extends Readable {
  private config: StreamingDataConfig;
  private sizeConfig: any;
  private currentSection = 0;
  private currentChunk = 0;
  private startTime: number;
  private startMemory: number;
  private metrics: Partial<StreamingDataMetrics> = {};

  constructor(config: StreamingDataConfig) {
    super({ objectMode: false });
    this.config = config;
    this.sizeConfig = STREAMING_DATA_SIZES[config.size].readme;
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage().heapUsed;
  }

  _read(): void {
    try {
      if (this.currentSection === 0) {
        // Generate header
        this.push(this.generateHeader());
        this.currentSection++;
        return;
      }

      if (this.currentSection <= this.sizeConfig.sections) {
        // Generate section
        const sectionContent = this.generateSection(this.currentSection - 1);
        this.push(sectionContent);
        this.currentSection++;
        return;
      }

      // End of stream
      this.push(null);
      this.updateMetrics();
    } catch (error) {
      this.emit('error', error);
    }
  }

  private generateHeader(): string {
    const { size } = this.config;
    return `# Streaming README Test (${size})\n\n` +
           `This README is generated using streaming data to minimize memory usage.\n\n` +
           `## Table of Contents\n\n`;
  }

  private generateSection(index: number): string {
    const templates = CONTENT_TEMPLATES.readme;
    const sectionTypes = ['installation', 'usage', 'configuration', 'api', 'examples', 'deployment'];
    const sectionType = sectionTypes[index % sectionTypes.length];
    const language = templates.languages[Math.floor(Math.random() * templates.languages.length)];
    const framework = templates.frameworks[Math.floor(Math.random() * templates.frameworks.length)];
    
    let content = `## ${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} ${index + 1}\n\n`;
    
    // Add description
    content += this.generateRandomText(3) + '\n\n';
    
    // Add framework mention
    content += `This section covers ${framework} integration with ${language}.\n\n`;
    
    // Add code block
    if (Math.random() > 0.3) {
      content += `\`\`\`${language}\n${this.generateCodeBlock(language)}\n\`\`\`\n\n`;
    }
    
    // Add command examples
    if (Math.random() > 0.5) {
      const command = templates.commands[Math.floor(Math.random() * templates.commands.length)];
      const testCommand = templates.testCommands[Math.floor(Math.random() * templates.testCommands.length)];
      
      content += `### Commands\n\n`;
      content += `\`\`\`bash\n# Install dependencies\n${command}\n\n# Run tests\n${testCommand}\n\`\`\`\n\n`;
    }
    
    return content;
  }

  private generateCodeBlock(language: string): string {
    const codeExamples: Record<string, string> = {
      javascript: `
function processData(data) {
  return data.map(item => ({
    ...item,
    processed: true,
    timestamp: Date.now()
  }));
}`,
      python: `
def process_data(data):
    return [
        {**item, 'processed': True, 'timestamp': time.time()}
        for item in data
    ]`,
      go: `
func processData(data []Item) []Item {
    for i := range data {
        data[i].Processed = true
        data[i].Timestamp = time.Now().Unix()
    }
    return data
}`
    };

    return codeExamples[language] || codeExamples.javascript;
  }

  private generateRandomText(sentences: number): string {
    const words = [
      'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
      'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore'
    ];
    
    const result = [];
    for (let i = 0; i < sentences; i++) {
      const sentenceLength = Math.floor(Math.random() * 10) + 5;
      const sentence = [];
      for (let j = 0; j < sentenceLength; j++) {
        sentence.push(words[Math.floor(Math.random() * words.length)]);
      }
      result.push(sentence.join(' ') + '.');
    }
    
    return result.join(' ');
  }

  private updateMetrics(): void {
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    
    this.metrics = {
      generationTime: endTime - this.startTime,
      peakMemoryUsage: Math.max(endMemory, this.startMemory),
      chunksGenerated: this.currentSection,
      bytesGenerated: 0 // Will be updated by consumer
    };
  }

  getMetrics(): StreamingDataMetrics {
    // Ensure metrics are updated when requested
    if (!this.metrics.generationTime) {
      this.updateMetrics();
    }
    return this.metrics as StreamingDataMetrics;
  }
}

/**
 * Streaming package.json generator
 */
export class StreamingPackageJsonGenerator extends Readable {
  private config: StreamingDataConfig;
  private sizeConfig: any;
  private currentDependency = 0;
  private phase: 'header' | 'dependencies' | 'devDependencies' | 'scripts' | 'footer' = 'header';

  constructor(config: StreamingDataConfig) {
    super({ objectMode: false });
    this.config = config;
    this.sizeConfig = STREAMING_DATA_SIZES[config.size]['package-json'];
  }

  _read(): void {
    try {
      switch (this.phase) {
        case 'header':
          this.push(this.generateHeader());
          this.phase = 'dependencies';
          break;
        
        case 'dependencies':
          if (this.currentDependency < this.sizeConfig.dependencies) {
            this.push(this.generateDependency('dependencies'));
            this.currentDependency++;
          } else {
            this.currentDependency = 0;
            this.phase = 'devDependencies';
            // Continue to next phase immediately
            this._read();
            return;
          }
          break;
        
        case 'devDependencies':
          if (this.currentDependency < Math.floor(this.sizeConfig.dependencies / 2)) {
            this.push(this.generateDependency('devDependencies'));
            this.currentDependency++;
          } else {
            this.currentDependency = 0;
            this.phase = 'scripts';
            // Continue to next phase immediately
            this._read();
            return;
          }
          break;
        
        case 'scripts':
          if (this.currentDependency < this.sizeConfig.scripts) {
            this.push(this.generateScript());
            this.currentDependency++;
          } else {
            this.phase = 'footer';
            // Continue to next phase immediately
            this._read();
            return;
          }
          break;
        
        case 'footer':
          this.push(this.generateFooter());
          this.push(null);
          break;
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  private generateHeader(): string {
    return `{\n  "name": "streaming-test-package",\n  "version": "1.0.0",\n  "dependencies": {\n`;
  }

  private generateDependency(type: 'dependencies' | 'devDependencies'): string {
    const templates = CONTENT_TEMPLATES['package-json'];
    const deps = type === 'dependencies' ? templates.dependencies : templates.devDependencies;
    const dep = deps[Math.floor(Math.random() * deps.length)];
    const version = `^${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`;
    
    const maxDevDeps = Math.floor(this.sizeConfig.dependencies / 2);
    const isLast = (type === 'dependencies' && this.currentDependency === this.sizeConfig.dependencies - 1) ||
                   (type === 'devDependencies' && this.currentDependency === maxDevDeps - 1);
    
    const comma = isLast ? '' : ',';
    
    if (type === 'devDependencies' && this.currentDependency === 0) {
      return `  },\n  "devDependencies": {\n    "${dep}": "${version}"${comma}\n`;
    }
    
    return `    "${dep}": "${version}"${comma}\n`;
  }

  private generateScript(): string {
    const scripts = ['build', 'test', 'start', 'dev', 'lint', 'format'];
    const commands = ['webpack', 'jest', 'node', 'nodemon', 'eslint', 'prettier'];
    
    const script = scripts[this.currentDependency % scripts.length];
    const command = commands[this.currentDependency % commands.length];
    
    const isLast = this.currentDependency === this.sizeConfig.scripts - 1;
    const comma = isLast ? '' : ',';
    
    if (this.currentDependency === 0) {
      return `  },\n  "scripts": {\n    "${script}": "${command}"${comma}\n`;
    }
    
    return `    "${script}${this.currentDependency}": "${command}"${comma}\n`;
  }

  private generateFooter(): string {
    return `  }\n}\n`;
  }
}

/**
 * Factory for creating streaming data generators
 */
export class StreamingDataFactory {
  /**
   * Create a streaming data generator
   */
  static createGenerator(config: StreamingDataConfig): Readable {
    switch (config.type) {
      case 'readme':
        return new StreamingReadmeGenerator(config);
      case 'package-json':
        return new StreamingPackageJsonGenerator(config);
      default:
        throw new Error(`Unsupported streaming data type: ${config.type}`);
    }
  }

  /**
   * Generate streaming data and collect it into a string
   */
  static async generateString(config: StreamingDataConfig): Promise<{ content: string; metrics: StreamingDataMetrics }> {
    const generator = this.createGenerator(config);
    const chunks: string[] = [];
    let bytesGenerated = 0;
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    let peakMemoryUsage = startMemory;

    return new Promise((resolve, reject) => {
      generator.on('data', (chunk: Buffer) => {
        const chunkStr = chunk.toString();
        chunks.push(chunkStr);
        bytesGenerated += chunk.length;
        
        // Track peak memory usage
        const currentMemory = process.memoryUsage().heapUsed;
        peakMemoryUsage = Math.max(peakMemoryUsage, currentMemory);
      });

      generator.on('end', () => {
        const endTime = Date.now();
        
        const metrics: StreamingDataMetrics = {
          bytesGenerated,
          generationTime: Math.max(endTime - startTime, 1), // Ensure at least 1ms
          peakMemoryUsage: peakMemoryUsage - startMemory,
          chunksGenerated: chunks.length
        };

        resolve({
          content: chunks.join(''),
          metrics
        });
      });

      generator.on('error', reject);
    });
  }

  /**
   * Create a streaming data generator with memory monitoring
   */
  static createMonitoredGenerator(config: StreamingDataConfig): {
    generator: Readable;
    getMetrics: () => StreamingDataMetrics;
  } {
    const generator = this.createGenerator(config);
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    let bytesGenerated = 0;
    let chunksGenerated = 0;
    let peakMemoryUsage = startMemory;

    // Monitor memory usage
    const originalPush = generator.push.bind(generator);
    generator.push = function(chunk: any) {
      if (chunk !== null) {
        const currentMemory = process.memoryUsage().heapUsed;
        peakMemoryUsage = Math.max(peakMemoryUsage, currentMemory);
        
        if (Buffer.isBuffer(chunk)) {
          bytesGenerated += chunk.length;
        } else if (typeof chunk === 'string') {
          bytesGenerated += Buffer.byteLength(chunk);
        }
        chunksGenerated++;
      }
      return originalPush(chunk);
    };

    const getMetrics = (): StreamingDataMetrics => ({
      bytesGenerated,
      generationTime: Date.now() - startTime,
      peakMemoryUsage,
      chunksGenerated
    });

    return { generator, getMetrics };
  }
}

/**
 * Utility functions for streaming data
 */
export class StreamingDataUtils {
  /**
   * Compare memory usage between streaming and static fixtures
   */
  static async compareMemoryUsage(
    config: StreamingDataConfig,
    staticContent: string
  ): Promise<{
    streaming: StreamingDataMetrics;
    static: { memoryUsage: number; generationTime: number };
    improvement: { memoryReduction: number; timeComparison: number };
  }> {
    // Measure static fixture memory usage
    const staticStartTime = Date.now();
    const staticStartMemory = process.memoryUsage().heapUsed;
    
    // Simulate loading static content
    const staticBuffer = Buffer.from(staticContent);
    const staticEndMemory = process.memoryUsage().heapUsed;
    const staticEndTime = Date.now();
    
    const staticMetrics = {
      memoryUsage: staticEndMemory - staticStartMemory,
      generationTime: staticEndTime - staticStartTime
    };

    // Measure streaming data memory usage
    const { metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);

    const improvement = {
      memoryReduction: ((staticMetrics.memoryUsage - streamingMetrics.peakMemoryUsage) / staticMetrics.memoryUsage) * 100,
      timeComparison: streamingMetrics.generationTime / staticMetrics.generationTime
    };

    return {
      streaming: streamingMetrics,
      static: staticMetrics,
      improvement
    };
  }

  /**
   * Validate streaming data configuration
   */
  static validateConfig(config: StreamingDataConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.type) {
      errors.push('Data type is required');
    } else if (!['readme', 'package-json', 'dockerfile', 'yaml-config'].includes(config.type)) {
      errors.push(`Unsupported data type: ${config.type}`);
    }

    if (!config.size) {
      errors.push('Size is required');
    } else if (!['small', 'medium', 'large', 'xlarge'].includes(config.size)) {
      errors.push(`Unsupported size: ${config.size}`);
    }

    if (config.maxMemoryUsage && config.maxMemoryUsage < 1024) {
      errors.push('Maximum memory usage must be at least 1KB');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get recommended configuration for test scenario
   */
  static getRecommendedConfig(scenario: 'unit' | 'integration' | 'performance'): StreamingDataConfig {
    const configs = {
      unit: { type: 'readme' as const, size: 'small' as const, maxMemoryUsage: 1024 * 1024 }, // 1MB
      integration: { type: 'readme' as const, size: 'medium' as const, maxMemoryUsage: 5 * 1024 * 1024 }, // 5MB
      performance: { type: 'readme' as const, size: 'large' as const, maxMemoryUsage: 20 * 1024 * 1024 } // 20MB
    };

    return configs[scenario];
  }
}