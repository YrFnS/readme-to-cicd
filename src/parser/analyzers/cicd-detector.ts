import { AnalyzerResult, CICDInfo } from '../types';
import { MarkdownAST } from '../../shared/markdown-parser';
import { BaseAnalyzer } from './base-analyzer';
import { AnalysisContext } from '../../shared/types/analysis-context';

export class CICDDetector extends BaseAnalyzer<CICDInfo> {
  readonly name = 'CICDDetector';

  private cicdPatterns = {
    githubActions: [/github\\s+actions/i, /\\.github\\/workflows/i, /actions\\/checkout/i, /GITHUB_TOKEN/i],
    gitlabCI: [/gitlab\\s+ci/i, /\\.gitlab-ci\\.yml/i, /CI_JOB_TOKEN/i],
    jenkins: [/jenkins/i, /jenkinsfile/i, /JENKINS_URL/i],
    circleCI: [/circleci/i, /config\\.yml/i, /CIRCLECI/i],
    azureDevOps: [/azure\\s+devops/i, /azure-pipelines\\.yml/i, /AZURE_DEVOPS/i],
    travisCI: [/travis\\s+ci/i, /\\.travis\\.yml/i],
    general: [/ci\\/cd/i, /continuous\\s+integration/i, /continuous\\s+delivery/i]
  };

  async analyze(ast: MarkdownAST, content: string, context?: AnalysisContext): Promise<AnalyzerResult<CICDInfo>> {
    try {
      const cicdInfo: CICDInfo = {
        tools: [],
        configurations: [],
        confidence: 0
      };

      const matches = this.findCICDReferences(content);

      if (matches.length > 0) {
        cicdInfo.tools = matches.map(match => ({
          name: match.tool,
          confidence: match.confidence,
          evidence: match.evidence
        }));
        cicdInfo.configurations = matches.map(match => ({
          tool: match.tool,
          file: match.file || null,
          mentions: match.mentions
        }));
        cicdInfo.confidence = this.calculateConfidence(matches);
      }

      return {
        success: true,
        data: cicdInfo,
        confidence: cicdInfo.confidence,
        sources: ['text-mention', 'code-block']
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        confidence: 0,
        errors: [{
          code: 'CICD_DETECTION_ERROR',
          message: `Failed to detect CI/CD configurations: ${error instanceof Error ? error.message : 'Unknown error'}`,
          component: this.name,
          severity: 'error'
        }]
      };
    }
  }

  private findCICDReferences(content: string): { tool: string; confidence: number; evidence: string[]; file?: string; mentions: number }[] {
    const matches: { tool: string; confidence: number; evidence: string[]; file?: string; mentions: number }[] = [];

    for (const [tool, patterns] of Object.entries(this.cicdPatterns)) {
      let mentionCount = 0;
      const evidence: string[] = [];
      let file: string | undefined;

      patterns.forEach(pattern => {
        const regex = new RegExp(pattern.source || pattern, 'gi');
        let match;
        while ((match = regex.exec(content)) !== null) {
          mentionCount++;
          evidence.push(match[0]);
          if (tool === 'githubActions' && match[0].includes('.github/workflows')) {
            file = '.github/workflows/*.yml';
          } else if (tool === 'gitlabCI' && match[0].includes('.gitlab-ci.yml')) {
            file = '.gitlab-ci.yml';
          }
          // Add more file detections as needed
        }
      });

      if (mentionCount > 0) {
        const confidence = Math.min(mentionCount * 0.2, 1.0);
        matches.push({ tool, confidence, evidence, file, mentions: mentionCount });
      }
    }

    return matches;
  }

  private calculateConfidence(matches: any[]): number {
    if (matches.length === 0) return 0;

    const totalConfidence = matches.reduce((sum, match) => sum + match.confidence, 0);
    return totalConfidence / matches.length;
  }
}

// Extend types if needed
export interface CICDInfo {
  tools: Array<{ name: string; confidence: number; evidence: string[] }>;
  configurations: Array<{ tool: string; file: string | null; mentions: number }>;
  confidence: number;
}