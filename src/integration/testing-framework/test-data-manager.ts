/**
 * Test data management implementation
 */

import { TestDataManager, MaskingRule } from './interfaces.js';

export class TestDataManagerImpl implements TestDataManager {
  private dataGenerators: Map<string, DataGenerator> = new Map();
  private dataSets: Map<string, any[]> = new Map();
  private maskingEngine: DataMaskingEngine;
  private anonymizer: DataAnonymizer;

  constructor() {
    this.maskingEngine = new DataMaskingEngine();
    this.anonymizer = new DataAnonymizer();
    this.initializeDataGenerators();
  }

  /**
   * Generate test data based on schema
   */
  async generateTestData(schema: any, count: number): Promise<any[]> {
    try {
      const generator = this.getGeneratorForSchema(schema);
      const data: any[] = [];
      
      for (let i = 0; i < count; i++) {
        const record = await generator.generateRecord(schema);
        data.push(record);
      }
      
      return data;
    } catch (error) {
      throw new Error(`Failed to generate test data: ${error}`);
    }
  }

  /**
   * Generate random data of specific type
   */
  async generateRandomData(type: string, constraints?: any): Promise<any> {
    try {
      const generator = this.dataGenerators.get(type);
      if (!generator) {
        throw new Error(`No generator available for type: ${type}`);
      }
      
      return await generator.generateValue(constraints);
    } catch (error) {
      throw new Error(`Failed to generate random data: ${error}`);
    }
  }

  /**
   * Setup test data for a specific dataset
   */
  async setupTestData(dataset: string): Promise<void> {
    try {
      // Load dataset configuration
      const config = await this.loadDatasetConfig(dataset);
      
      // Generate or load test data
      let data: any[];
      if (config.generate) {
        data = await this.generateTestData(config.schema, config.count);
      } else {
        data = await this.loadStaticData(config.source);
      }
      
      // Apply transformations if specified
      if (config.transformations) {
        data = await this.applyTransformations(data, config.transformations);
      }
      
      // Store dataset
      this.dataSets.set(dataset, data);
      
      // Persist to database/storage if needed
      if (config.persist) {
        await this.persistDataset(dataset, data, config.storage);
      }
    } catch (error) {
      throw new Error(`Failed to setup test data for dataset ${dataset}: ${error}`);
    }
  }

  /**
   * Cleanup test data for a specific dataset
   */
  async cleanupTestData(dataset: string): Promise<void> {
    try {
      // Remove from memory
      this.dataSets.delete(dataset);
      
      // Load dataset configuration for cleanup
      const config = await this.loadDatasetConfig(dataset);
      
      // Clean up persisted data if needed
      if (config.persist) {
        await this.cleanupPersistedData(dataset, config.storage);
      }
    } catch (error) {
      throw new Error(`Failed to cleanup test data for dataset ${dataset}: ${error}`);
    }
  }

  /**
   * Mask sensitive data according to rules
   */
  async maskSensitiveData(data: any, rules: MaskingRule[]): Promise<any> {
    try {
      return await this.maskingEngine.maskData(data, rules);
    } catch (error) {
      throw new Error(`Failed to mask sensitive data: ${error}`);
    }
  }

  /**
   * Anonymize data for privacy protection
   */
  async anonymizeData(data: any): Promise<any> {
    try {
      return await this.anonymizer.anonymize(data);
    } catch (error) {
      throw new Error(`Failed to anonymize data: ${error}`);
    }
  }

  /**
   * Get dataset by name
   */
  getDataset(name: string): any[] | undefined {
    return this.dataSets.get(name);
  }

  /**
   * Register custom data generator
   */
  registerGenerator(type: string, generator: DataGenerator): void {
    this.dataGenerators.set(type, generator);
  }

  // Private helper methods

  private initializeDataGenerators(): void {
    this.dataGenerators.set('string', new StringGenerator());
    this.dataGenerators.set('number', new NumberGenerator());
    this.dataGenerators.set('boolean', new BooleanGenerator());
    this.dataGenerators.set('date', new DateGenerator());
    this.dataGenerators.set('email', new EmailGenerator());
    this.dataGenerators.set('phone', new PhoneGenerator());
    this.dataGenerators.set('address', new AddressGenerator());
    this.dataGenerators.set('name', new NameGenerator());
    this.dataGenerators.set('uuid', new UUIDGenerator());
    this.dataGenerators.set('object', new ObjectGenerator());
    this.dataGenerators.set('array', new ArrayGenerator());
  }

  private getGeneratorForSchema(schema: any): DataGenerator {
    const schemaType = this.determineSchemaType(schema);
    const generator = this.dataGenerators.get(schemaType);
    
    if (!generator) {
      throw new Error(`No generator available for schema type: ${schemaType}`);
    }
    
    return generator;
  }

  private determineSchemaType(schema: any): string {
    if (schema.type) {
      return schema.type;
    }
    
    if (schema.properties) {
      return 'object';
    }
    
    if (schema.items) {
      return 'array';
    }
    
    return 'string'; // Default fallback
  }

  private async loadDatasetConfig(dataset: string): Promise<DatasetConfig> {
    // Load dataset configuration from file or database
    return {
      name: dataset,
      generate: true,
      schema: {},
      count: 100,
      persist: false,
      storage: {}
    };
  }

  private async loadStaticData(source: string): Promise<any[]> {
    // Load static test data from file or external source
    return [];
  }

  private async applyTransformations(data: any[], transformations: Transformation[]): Promise<any[]> {
    let transformedData = [...data];
    
    for (const transformation of transformations) {
      transformedData = await this.applyTransformation(transformedData, transformation);
    }
    
    return transformedData;
  }

  private async applyTransformation(data: any[], transformation: Transformation): Promise<any[]> {
    switch (transformation.type) {
      case 'filter':
        return data.filter(transformation.predicate);
      case 'map':
        return data.map(transformation.mapper);
      case 'sort':
        return data.sort(transformation.comparator);
      case 'sample':
        return this.sampleData(data, transformation.size);
      default:
        return data;
    }
  }

  private sampleData(data: any[], size: number): any[] {
    const shuffled = [...data].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
  }

  private async persistDataset(dataset: string, data: any[], storage: any): Promise<void> {
    // Persist dataset to storage (database, file system, etc.)
  }

  private async cleanupPersistedData(dataset: string, storage: any): Promise<void> {
    // Clean up persisted dataset from storage
  }
}

// Data generator implementations

abstract class DataGenerator {
  abstract generateValue(constraints?: any): Promise<any>;
  abstract generateRecord(schema: any): Promise<any>;
}

class StringGenerator extends DataGenerator {
  async generateValue(constraints?: StringConstraints): Promise<string> {
    const length = constraints?.length || 10;
    const charset = constraints?.charset || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return result;
  }

  async generateRecord(schema: any): Promise<string> {
    return this.generateValue(schema.constraints);
  }
}

class NumberGenerator extends DataGenerator {
  async generateValue(constraints?: NumberConstraints): Promise<number> {
    const min = constraints?.min || 0;
    const max = constraints?.max || 100;
    const isInteger = constraints?.integer !== false;
    
    const value = Math.random() * (max - min) + min;
    return isInteger ? Math.floor(value) : value;
  }

  async generateRecord(schema: any): Promise<number> {
    return this.generateValue(schema.constraints);
  }
}

class BooleanGenerator extends DataGenerator {
  async generateValue(constraints?: any): Promise<boolean> {
    const probability = constraints?.trueProbability || 0.5;
    return Math.random() < probability;
  }

  async generateRecord(schema: any): Promise<boolean> {
    return this.generateValue(schema.constraints);
  }
}

class DateGenerator extends DataGenerator {
  async generateValue(constraints?: DateConstraints): Promise<Date> {
    const start = constraints?.start || new Date('2020-01-01');
    const end = constraints?.end || new Date();
    
    const startTime = start.getTime();
    const endTime = end.getTime();
    const randomTime = startTime + Math.random() * (endTime - startTime);
    
    return new Date(randomTime);
  }

  async generateRecord(schema: any): Promise<Date> {
    return this.generateValue(schema.constraints);
  }
}

class EmailGenerator extends DataGenerator {
  private domains = ['example.com', 'test.org', 'sample.net', 'demo.io'];

  async generateValue(constraints?: any): Promise<string> {
    const nameGenerator = new StringGenerator();
    const name = await nameGenerator.generateValue({ length: 8, charset: 'abcdefghijklmnopqrstuvwxyz' });
    const domain = this.domains[Math.floor(Math.random() * this.domains.length)];
    
    return `${name}@${domain}`;
  }

  async generateRecord(schema: any): Promise<string> {
    return this.generateValue(schema.constraints);
  }
}

class PhoneGenerator extends DataGenerator {
  async generateValue(constraints?: any): Promise<string> {
    const format = constraints?.format || 'US';
    
    switch (format) {
      case 'US':
        return `+1${this.generateDigits(3)}${this.generateDigits(3)}${this.generateDigits(4)}`;
      case 'UK':
        return `+44${this.generateDigits(10)}`;
      default:
        return `+${this.generateDigits(12)}`;
    }
  }

  async generateRecord(schema: any): Promise<string> {
    return this.generateValue(schema.constraints);
  }

  private generateDigits(count: number): string {
    let result = '';
    for (let i = 0; i < count; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
    return result;
  }
}

class AddressGenerator extends DataGenerator {
  private streets = ['Main St', 'Oak Ave', 'First St', 'Second Ave', 'Park Rd'];
  private cities = ['Springfield', 'Franklin', 'Georgetown', 'Madison', 'Washington'];
  private states = ['CA', 'NY', 'TX', 'FL', 'IL'];

  async generateValue(constraints?: any): Promise<any> {
    const number = Math.floor(Math.random() * 9999) + 1;
    const street = this.streets[Math.floor(Math.random() * this.streets.length)];
    const city = this.cities[Math.floor(Math.random() * this.cities.length)];
    const state = this.states[Math.floor(Math.random() * this.states.length)];
    const zip = Math.floor(Math.random() * 90000) + 10000;

    return {
      street: `${number} ${street}`,
      city,
      state,
      zip: zip.toString()
    };
  }

  async generateRecord(schema: any): Promise<any> {
    return this.generateValue(schema.constraints);
  }
}

class NameGenerator extends DataGenerator {
  private firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jessica'];
  private lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

  async generateValue(constraints?: any): Promise<any> {
    const firstName = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
    const lastName = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];

    return constraints?.format === 'full' ? `${firstName} ${lastName}` : { firstName, lastName };
  }

  async generateRecord(schema: any): Promise<any> {
    return this.generateValue(schema.constraints);
  }
}

class UUIDGenerator extends DataGenerator {
  async generateValue(constraints?: any): Promise<string> {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async generateRecord(schema: any): Promise<string> {
    return this.generateValue(schema.constraints);
  }
}

class ObjectGenerator extends DataGenerator {
  async generateValue(constraints?: any): Promise<any> {
    const schema = constraints || {};
    const result: any = {};

    for (const [key, fieldSchema] of Object.entries(schema.properties || {})) {
      const fieldType = (fieldSchema as any).type || 'string';
      const generator = new TestDataManagerImpl().dataGenerators.get(fieldType);
      
      if (generator) {
        result[key] = await generator.generateValue((fieldSchema as any).constraints);
      }
    }

    return result;
  }

  async generateRecord(schema: any): Promise<any> {
    return this.generateValue(schema);
  }
}

class ArrayGenerator extends DataGenerator {
  async generateValue(constraints?: any): Promise<any[]> {
    const length = constraints?.length || 5;
    const itemSchema = constraints?.items || { type: 'string' };
    const itemType = itemSchema.type || 'string';
    
    const generator = new TestDataManagerImpl().dataGenerators.get(itemType);
    if (!generator) {
      throw new Error(`No generator for array item type: ${itemType}`);
    }

    const result: any[] = [];
    for (let i = 0; i < length; i++) {
      result.push(await generator.generateValue(itemSchema.constraints));
    }

    return result;
  }

  async generateRecord(schema: any): Promise<any[]> {
    return this.generateValue(schema);
  }
}

// Data masking and anonymization

class DataMaskingEngine {
  async maskData(data: any, rules: MaskingRule[]): Promise<any> {
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this.maskObject(item, rules)));
    } else if (typeof data === 'object' && data !== null) {
      return this.maskObject(data, rules);
    }
    
    return data;
  }

  private async maskObject(obj: any, rules: MaskingRule[]): Promise<any> {
    const masked = { ...obj };

    for (const rule of rules) {
      if (obj.hasOwnProperty(rule.field)) {
        masked[rule.field] = await this.applyMaskingRule(obj[rule.field], rule);
      }
    }

    return masked;
  }

  private async applyMaskingRule(value: any, rule: MaskingRule): Promise<any> {
    switch (rule.method) {
      case 'hash':
        return this.hashValue(value);
      case 'encrypt':
        return this.encryptValue(value);
      case 'replace':
        return rule.replacement || '***';
      case 'remove':
        return undefined;
      default:
        return value;
    }
  }

  private hashValue(value: any): string {
    // Simple hash implementation (in production, use proper crypto)
    return `hash_${Math.abs(JSON.stringify(value).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0))}`;
  }

  private encryptValue(value: any): string {
    // Simple encryption placeholder (in production, use proper encryption)
    return `encrypted_${btoa(JSON.stringify(value))}`;
  }
}

class DataAnonymizer {
  async anonymize(data: any): Promise<any> {
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this.anonymizeObject(item)));
    } else if (typeof data === 'object' && data !== null) {
      return this.anonymizeObject(data);
    }
    
    return data;
  }

  private async anonymizeObject(obj: any): Promise<any> {
    const anonymized = { ...obj };
    
    // Common PII fields to anonymize
    const piiFields = ['name', 'email', 'phone', 'address', 'ssn', 'creditCard'];
    
    for (const field of piiFields) {
      if (obj.hasOwnProperty(field)) {
        anonymized[field] = await this.anonymizeField(field, obj[field]);
      }
    }

    return anonymized;
  }

  private async anonymizeField(fieldType: string, value: any): Promise<any> {
    const generators = new TestDataManagerImpl();
    
    switch (fieldType) {
      case 'name':
        return generators.generateRandomData('name');
      case 'email':
        return generators.generateRandomData('email');
      case 'phone':
        return generators.generateRandomData('phone');
      case 'address':
        return generators.generateRandomData('address');
      default:
        return generators.generateRandomData('string', { length: 8 });
    }
  }
}

// Supporting interfaces and types

interface DatasetConfig {
  name: string;
  generate: boolean;
  schema?: any;
  count?: number;
  source?: string;
  transformations?: Transformation[];
  persist: boolean;
  storage: any;
}

interface Transformation {
  type: 'filter' | 'map' | 'sort' | 'sample';
  predicate?: (item: any) => boolean;
  mapper?: (item: any) => any;
  comparator?: (a: any, b: any) => number;
  size?: number;
}

interface StringConstraints {
  length?: number;
  charset?: string;
  pattern?: RegExp;
}

interface NumberConstraints {
  min?: number;
  max?: number;
  integer?: boolean;
}

interface DateConstraints {
  start?: Date;
  end?: Date;
}