import { describe, it, expect, beforeEach } from 'vitest';
import { EvidenceCollectorImpl } from '../../../src/detection/utils/evidence-collector';
import { ProjectInfo } from '../../../src/detection/interfaces/framework-detector';
import { Evidence, EvidenceType } from '../../../src/detection/interfaces/evidence';

describe('EvidenceCollectorImpl', () => {
  let collector: EvidenceCollectorImpl;

  beforeEach(() => {
    collector = new EvidenceCollectorImpl();
  });

  describe('evidence collection', () => {
    it('should collect dependency evidence', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['JavaScript'],
        dependencies: ['react', 'express', 'lodash'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'Test project'
      };

      const evidence = await collector.collectEvidence(projectInfo);

      const dependencyEvidence = evidence.filter(e => e.type === 'dependency');
      expect(dependencyEvidence).toHaveLength(3);
      expect(dependencyEvidence.map(e => e.value)).toContain('react');
      expect(dependencyEvidence.map(e => e.value)).toContain('express');
      expect(dependencyEvidence.map(e => e.value)).toContain('lodash');
    });

    it('should collect config file evidence', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json', 'webpack.config.js', 'tsconfig.json'],
        rawContent: 'Test project'
      };

      const evidence = await collector.collectEvidence(projectInfo);

      const configEvidence = evidence.filter(e => e.type === 'config_file');
      expect(configEvidence).toHaveLength(3);
      expect(configEvidence.map(e => e.value)).toContain('package.json');
      expect(configEvidence.map(e => e.value)).toContain('webpack.config.js');
      expect(configEvidence.map(e => e.value)).toContain('tsconfig.json');
    });

    it('should collect command evidence', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: ['npm run build', 'webpack --mode production'],
        testCommands: ['npm test', 'jest'],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'Test project'
      };

      const evidence = await collector.collectEvidence(projectInfo);

      const commandEvidence = evidence.filter(e => e.type === 'command_pattern');
      expect(commandEvidence).toHaveLength(4);
      
      const buildCommands = commandEvidence.filter(e => e.context?.commandType === 'build');
      const testCommands = commandEvidence.filter(e => e.context?.commandType === 'test');
      
      expect(buildCommands).toHaveLength(2);
      expect(testCommands).toHaveLength(2);
    });

    it('should collect text mention evidence', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'This is a React application using Express for the backend and Docker for containerization.'
      };

      const evidence = await collector.collectEvidence(projectInfo);

      const textEvidence = evidence.filter(e => e.type === 'text_mention');
      expect(textEvidence.length).toBeGreaterThan(0);
      
      const mentionedFrameworks = textEvidence.map(e => e.value);
      expect(mentionedFrameworks).toContain('react');
      expect(mentionedFrameworks).toContain('express');
      expect(mentionedFrameworks).toContain('docker');
    });

    it('should collect comprehensive evidence from complex project', async () => {
      const projectInfo: ProjectInfo = {
        name: 'fullstack-app',
        description: 'Full-stack React and Django application',
        languages: ['JavaScript', 'Python'],
        dependencies: ['react', 'django', 'webpack'],
        buildCommands: ['npm run build', 'python manage.py collectstatic'],
        testCommands: ['npm test', 'python manage.py test'],
        installationSteps: ['npm install', 'pip install -r requirements.txt'],
        usageExamples: ['npm start', 'python manage.py runserver'],
        configFiles: ['package.json', 'requirements.txt', 'webpack.config.js'],
        rawContent: 'Full-stack application using React for frontend, Django for backend, with Docker deployment.'
      };

      const evidence = await collector.collectEvidence(projectInfo);

      expect(evidence.length).toBeGreaterThan(10);
      
      const evidenceTypes = new Set(evidence.map(e => e.type));
      expect(evidenceTypes).toContain('dependency');
      expect(evidenceTypes).toContain('config_file');
      expect(evidenceTypes).toContain('command_pattern');
      expect(evidenceTypes).toContain('text_mention');
    });
  });

  describe('evidence weighting', () => {
    it('should assign correct weights to different evidence types', () => {
      const configEvidence: Evidence = {
        type: 'config_file',
        source: 'package.json',
        value: 'package.json',
        weight: 0
      };

      const dependencyEvidence: Evidence = {
        type: 'dependency',
        source: 'package.json',
        value: 'react',
        weight: 0
      };

      const textEvidence: Evidence = {
        type: 'text_mention',
        source: 'readme',
        value: 'react',
        weight: 0
      };

      const configWeight = collector.weightEvidence(configEvidence);
      const dependencyWeight = collector.weightEvidence(dependencyEvidence);
      const textWeight = collector.weightEvidence(textEvidence);

      expect(configWeight).toBeGreaterThan(dependencyWeight);
      expect(dependencyWeight).toBeGreaterThan(textWeight);
      expect(configWeight).toBe(0.8);
      expect(dependencyWeight).toBe(0.7);
      expect(textWeight).toBe(0.2);
    });

    it('should handle unknown evidence types', () => {
      const unknownEvidence: Evidence = {
        type: 'unknown_type' as EvidenceType,
        source: 'unknown',
        value: 'unknown',
        weight: 0
      };

      const weight = collector.weightEvidence(unknownEvidence);
      expect(weight).toBe(0.1);
    });
  });

  describe('evidence filtering', () => {
    let sampleEvidence: Evidence[];

    beforeEach(() => {
      sampleEvidence = [
        {
          type: 'config_file',
          source: 'package.json',
          value: 'package.json',
          weight: 0.8
        },
        {
          type: 'dependency',
          source: 'package.json',
          value: 'react',
          weight: 0.7
        },
        {
          type: 'text_mention',
          source: 'readme.md',
          value: 'react',
          weight: 0.2
        },
        {
          type: 'command_pattern',
          source: 'scripts',
          value: 'npm build',
          weight: 0.5
        }
      ];
    });

    it('should filter by evidence types', () => {
      const filtered = collector.filterEvidence(sampleEvidence, {
        types: ['config_file', 'dependency']
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.map(e => e.type)).toContain('config_file');
      expect(filtered.map(e => e.type)).toContain('dependency');
    });

    it('should filter by minimum weight', () => {
      const filtered = collector.filterEvidence(sampleEvidence, {
        minimumWeight: 0.6
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.weight >= 0.6)).toBe(true);
    });

    it('should filter by source patterns', () => {
      const filtered = collector.filterEvidence(sampleEvidence, {
        sourcePatterns: ['package']
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.source.includes('package'))).toBe(true);
    });

    it('should limit results', () => {
      const filtered = collector.filterEvidence(sampleEvidence, {
        limit: 2
      });

      expect(filtered).toHaveLength(2);
    });

    it('should apply multiple filters', () => {
      const filtered = collector.filterEvidence(sampleEvidence, {
        types: ['config_file', 'dependency', 'command_pattern'],
        minimumWeight: 0.4,
        limit: 2
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.weight >= 0.4)).toBe(true);
      expect(filtered.every(e => 
        ['config_file', 'dependency', 'command_pattern'].includes(e.type)
      )).toBe(true);
    });
  });

  describe('evidence aggregation', () => {
    it('should aggregate evidence correctly', () => {
      const evidence: Evidence[] = [
        {
          type: 'config_file',
          source: 'package.json',
          value: 'package.json',
          weight: 0.8
        },
        {
          type: 'dependency',
          source: 'package.json',
          value: 'react',
          weight: 0.7
        },
        {
          type: 'dependency',
          source: 'package.json',
          value: 'express',
          weight: 0.7
        },
        {
          type: 'text_mention',
          source: 'readme',
          value: 'react',
          weight: 0.2
        }
      ];

      const aggregation = collector.aggregateEvidence(evidence);

      expect(aggregation.totalCount).toBe(4);
      expect(aggregation.byType.dependency).toHaveLength(2);
      expect(aggregation.byType.config_file).toHaveLength(1);
      expect(aggregation.byType.text_mention).toHaveLength(1);
      expect(aggregation.totalWeight).toBeCloseTo(2.4, 1);
      expect(aggregation.averageConfidence).toBeCloseTo(0.6, 1);
      expect(aggregation.strongestEvidence).toHaveLength(3); // Top 3 by weight
    });

    it('should handle empty evidence', () => {
      const aggregation = collector.aggregateEvidence([]);

      expect(aggregation.totalCount).toBe(0);
      expect(aggregation.totalWeight).toBe(0);
      expect(aggregation.averageConfidence).toBe(0);
      expect(aggregation.strongestEvidence).toHaveLength(0);
    });

    it('should sort strongest evidence correctly', () => {
      const evidence: Evidence[] = [
        {
          type: 'text_mention',
          source: 'readme',
          value: 'react',
          weight: 0.2
        },
        {
          type: 'config_file',
          source: 'package.json',
          value: 'package.json',
          weight: 0.8
        },
        {
          type: 'dependency',
          source: 'package.json',
          value: 'react',
          weight: 0.7
        }
      ];

      const aggregation = collector.aggregateEvidence(evidence);

      expect(aggregation.strongestEvidence[0].weight).toBe(0.8);
      expect(aggregation.strongestEvidence[1].weight).toBe(0.7);
      expect(aggregation.strongestEvidence[2].weight).toBe(0.2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty project info', async () => {
      const projectInfo: ProjectInfo = {
        name: 'empty-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      const evidence = await collector.collectEvidence(projectInfo);
      expect(evidence).toHaveLength(0);
    });

    it('should handle case-insensitive text matching', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'This project uses REACT and Express.js for development.'
      };

      const evidence = await collector.collectEvidence(projectInfo);
      const textEvidence = evidence.filter(e => e.type === 'text_mention');
      
      expect(textEvidence.some(e => e.value === 'react')).toBe(true);
      expect(textEvidence.some(e => e.value === 'express')).toBe(true);
    });

    it('should not duplicate framework mentions', async () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'React React React application using React components.'
      };

      const evidence = await collector.collectEvidence(projectInfo);
      const reactMentions = evidence.filter(e => 
        e.type === 'text_mention' && e.value === 'react'
      );
      
      expect(reactMentions).toHaveLength(1);
    });
  });
});