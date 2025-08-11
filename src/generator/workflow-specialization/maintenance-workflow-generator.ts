/**
 * Maintenance Workflow Generator - Specialized for Maintenance workflows
 * Focuses on dependency updates and security patches
 */

import { DetectionResult, GenerationOptions, WorkflowOutput } from '../interfaces';
import { WorkflowTemplate, JobTemplate, StepTemplate, TriggerConfig } from '../types';
import { ghExpr, ghScript, ghEnvVar, ghSecret, ghNeeds, ghContext, ghStepOutput } from './github-actions-utils';

export class MaintenanceWorkflowGenerator {
  /**
   * Generate maintenance-focused workflow for dependency updates and security patches
   */
  async generateMaintenanceWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    const workflow = this.createMaintenanceWorkflowTemplate(detectionResult, options);
    const content = await this.renderWorkflow(workflow);
    
    return {
      filename: 'maintenance.yml',
      content,
      type: 'maintenance',
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '1.0.0',
        detectionSummary: this.createDetectionSummary(detectionResult),
        optimizations: this.getAppliedOptimizations(detectionResult, options),
        warnings: this.getWarnings(detectionResult)
      }
    };
  }

  /**
   * Create maintenance workflow template with dependency updates and security focus
   */
  private createMaintenanceWorkflowTemplate(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): WorkflowTemplate {
    return {
      name: 'Maintenance',
      type: 'maintenance',
      triggers: this.createMaintenanceTriggers(),
      jobs: this.createMaintenanceJobs(detectionResult, options),
      permissions: {
        contents: 'write',
        pullRequests: 'write',
        issues: 'write',
        securityEvents: 'write'
      }
    };
  }

  /**
   * Create maintenance-specific triggers (scheduled, manual dispatch, security alerts)
   */
  private createMaintenanceTriggers(): TriggerConfig {
    return {
      schedule: [
        {
          cron: '0 2 * * 1' // Weekly on Mondays at 2 AM
        },
        {
          cron: '0 6 1 * *' // Monthly on the 1st at 6 AM
        }
      ],
      workflowDispatch: {
        inputs: {
          updateType: {
            description: 'Type of maintenance to perform',
            required: true,
            type: 'choice',
            options: ['dependencies', 'security', 'all', 'major-updates']
          },
          createPR: {
            description: 'Create pull request for updates',
            required: false,
            type: 'boolean',
            default: 'true'
          },
          autoMerge: {
            description: 'Auto-merge safe updates',
            required: false,
            type: 'boolean',
            default: 'false'
          }
        }
      },
      repositoryDispatch: {
        types: ['security-alert', 'dependency-update']
      }
    };
  }

  /**
   * Create maintenance jobs focused on updates and security
   */
  private createMaintenanceJobs(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate[] {
    const jobs: JobTemplate[] = [];

    // Add dependency update job
    jobs.push(this.createDependencyUpdateJob(detectionResult, options));

    // Add security patch job
    jobs.push(this.createSecurityPatchJob(detectionResult, options));

    // Add cleanup job
    jobs.push(this.createCleanupJob(detectionResult, options));

    // Add health check job
    jobs.push(this.createHealthCheckJob(detectionResult, options));

    // Add documentation update job
    jobs.push(this.createDocumentationUpdateJob(detectionResult, options));

    return jobs;
  }

  /**
   * Create dependency update job
   */
  private createDependencyUpdateJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4',
        with: {
          token: '${{ secrets.GITHUB_TOKEN }}',
          'fetch-depth': 0
        }
      }
    ];

    // Add language-specific setup
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    if (primaryLanguage) {
      steps.push(...this.createLanguageSetupSteps(primaryLanguage.name, detectionResult));
    }

    // Add dependency update steps based on detected package managers
    steps.push(...this.createDependencyUpdateSteps(detectionResult, options));

    // Add testing steps to verify updates
    steps.push(...this.createUpdateVerificationSteps(detectionResult));

    // Add PR creation steps
    steps.push(...this.createPullRequestSteps('dependency-updates'));

    return {
      name: 'update-dependencies',
      runsOn: 'ubuntu-latest',
      steps,
      if: "github.event_name == 'schedule' || github.event.inputs.updateType == 'dependencies' || github.event.inputs.updateType == 'all'"
    };
  }

  /**
   * Create security patch job
   */
  private createSecurityPatchJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4',
        with: {
          token: '${{ secrets.GITHUB_TOKEN }}'
        }
      }
    ];

    // Add language-specific setup
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    if (primaryLanguage) {
      steps.push(...this.createLanguageSetupSteps(primaryLanguage.name, detectionResult));
    }

    // Add security scanning and patching steps
    steps.push(...this.createSecurityScanSteps(detectionResult));
    steps.push(...this.createSecurityPatchSteps(detectionResult, options));

    // Add verification steps
    steps.push(...this.createSecurityVerificationSteps(detectionResult));

    // Add PR creation for security fixes
    steps.push(...this.createPullRequestSteps('security-patches'));

    return {
      name: 'security-patches',
      runsOn: 'ubuntu-latest',
      steps,
      if: "github.event_name == 'repository_dispatch' || github.event.inputs.updateType == 'security' || github.event.inputs.updateType == 'all'"
    };
  }

  /**
   * Create cleanup job for old artifacts and dependencies
   */
  private createCleanupJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      },
      {
        name: 'Clean up old workflow runs',
        uses: 'actions/github-script@v7',
        with: {
          script: `
            const { owner, repo } = context.repo;
            const runs = await github.rest.actions.listWorkflowRuns({
              owner,
              repo,
              workflow_id: 'ci.yml',
              status: 'completed',
              per_page: 100
            });
            
            // Keep last 50 runs, delete older ones
            const runsToDelete = runs.data.workflow_runs.slice(50);
            
            for (const run of runsToDelete) {
              if (run.created_at < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) {
                try {
                  await github.rest.actions.deleteWorkflowRun({
                    owner,
                    repo,
                    run_id: run.id
                  });
                  console.log(\`Deleted workflow run \${run.id}\`);
                } catch (error) {
                  console.log(\`Failed to delete run \${run.id}: \${error.message}\`);
                }
              }
            }
          `
        }
      },
      {
        name: 'Clean up old artifacts',
        uses: 'actions/github-script@v7',
        with: {
          script: `
            const { owner, repo } = context.repo;
            const artifacts = await github.rest.actions.listArtifactsForRepo({
              owner,
              repo,
              per_page: 100
            });
            
            // Delete artifacts older than 30 days
            const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            
            for (const artifact of artifacts.data.artifacts) {
              if (new Date(artifact.created_at) < cutoffDate) {
                try {
                  await github.rest.actions.deleteArtifact({
                    owner,
                    repo,
                    artifact_id: artifact.id
                  });
                  console.log(\`Deleted artifact \${artifact.name}\`);
                } catch (error) {
                  console.log(\`Failed to delete artifact \${artifact.id}: \${error.message}\`);
                }
              }
            }
          `
        }
      }
    ];

    // Add language-specific cleanup steps
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    if (primaryLanguage) {
      steps.push(...this.createLanguageCleanupSteps(primaryLanguage.name, detectionResult));
    }

    return {
      name: 'cleanup',
      runsOn: 'ubuntu-latest',
      steps,
      if: "github.event_name == 'schedule' && github.event.schedule == '0 6 1 * *'" // Monthly cleanup
    };
  }

  /**
   * Create health check job to verify system status
   */
  private createHealthCheckJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      }
    ];

    // Add language-specific setup
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    if (primaryLanguage) {
      steps.push(...this.createLanguageSetupSteps(primaryLanguage.name, detectionResult));
    }

    // Add health check steps
    steps.push(...this.createSystemHealthSteps(detectionResult));

    // Add performance check steps
    steps.push(...this.createPerformanceCheckSteps(detectionResult));

    // Add issue creation for problems
    steps.push({
      name: 'Create issue for health problems',
      uses: 'actions/github-script@v7',
      with: {
        script: `
          const { owner, repo } = context.repo;
          
          // Check if health check failed
          const healthStatus = process.env.HEALTH_STATUS;
          if (healthStatus === 'failed') {
            await github.rest.issues.create({
              owner,
              repo,
              title: '🚨 System Health Check Failed',
              body: \`
              ## Health Check Failure
              
              The automated health check has detected issues with the system.
              
              **Timestamp:** \${new Date().toISOString()}
              **Workflow:** \${context.workflow}
              **Run ID:** \${context.runId}
              
              Please investigate and resolve the issues.
              \`,
              labels: ['maintenance', 'health-check', 'urgent']
            });
          }
        `
      },
      if: 'failure()'
    });

    return {
      name: 'health-check',
      runsOn: 'ubuntu-latest',
      steps,
      if: "github.event_name == 'schedule'"
    };
  }

  /**
   * Create documentation update job
   */
  private createDocumentationUpdateJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4',
        with: {
          token: '${{ secrets.GITHUB_TOKEN }}'
        }
      },
      {
        name: 'Update dependency documentation',
        run: [
          '# Update README with current dependency versions',
          'if [ -f package.json ]; then',
          '  NODE_VERSION=$(node --version)',
          '  sed -i "s/Node.js [0-9.]*/Node.js $NODE_VERSION/g" README.md || true',
          'fi',
          '',
          'if [ -f requirements.txt ]; then',
          '  PYTHON_VERSION=$(python --version | cut -d\' \' -f2)',
          '  sed -i "s/Python [0-9.]*/Python $PYTHON_VERSION/g" README.md || true',
          'fi',
          '',
          'if [ -f Cargo.toml ]; then',
          '  RUST_VERSION=$(rustc --version | cut -d\' \' -f2)',
          '  sed -i "s/Rust [0-9.]*/Rust $RUST_VERSION/g" README.md || true',
          'fi'
        ].join('\n')
      },
      {
        name: 'Generate dependency report',
        run: this.getDependencyReportScript(detectionResult)
      },
      {
        name: 'Update security badges',
        run: [
          '# Update security and dependency badges in README',
          'if [ -f README.md ]; then',
          '  # Update last-updated badge',
          '  CURRENT_DATE=$(date +%Y-%m-%d)',
          '  sed -i "s/last--updated-[0-9-]*/last--updated-$CURRENT_DATE/g" README.md || true',
          'fi'
        ].join('\n')
      }
    ];

    // Add PR creation for documentation updates
    steps.push(...this.createPullRequestSteps('documentation-updates'));

    return {
      name: 'update-documentation',
      runsOn: 'ubuntu-latest',
      steps,
      if: "github.event_name == 'schedule' && github.event.schedule == '0 6 1 * *'" // Monthly
    };
  }

  private createLanguageSetupSteps(
    language: string,
    detectionResult: DetectionResult
  ): StepTemplate[] {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return this.createNodeJSSetupSteps(detectionResult);
      case 'python':
        return this.createPythonSetupSteps(detectionResult);
      case 'java':
        return this.createJavaSetupSteps(detectionResult);
      case 'rust':
        return this.createRustSetupSteps();
      case 'go':
        return this.createGoSetupSteps();
      default:
        return [];
    }
  }

  private createNodeJSSetupSteps(detectionResult: DetectionResult): StepTemplate[] {
    const packageManager = detectionResult.packageManagers.find(pm => 
      ['npm', 'yarn', 'pnpm'].includes(pm.name)
    )?.name || 'npm';

    return [
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': '18',
          cache: packageManager
        }
      },
      {
        name: 'Install dependencies',
        run: packageManager === 'npm' ? 'npm ci' : `${packageManager} install --frozen-lockfile`
      }
    ];
  }

  private createPythonSetupSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Setup Python',
        uses: 'actions/setup-python@v5',
        with: {
          'python-version': '3.11'
        }
      },
      {
        name: 'Install dependencies',
        run: 'pip install -r requirements.txt'
      }
    ];
  }

  private createJavaSetupSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Setup JDK',
        uses: 'actions/setup-java@v4',
        with: {
          'java-version': '17',
          distribution: 'temurin'
        }
      }
    ];
  }

  private createRustSetupSteps(): StepTemplate[] {
    return [
      {
        name: 'Setup Rust',
        uses: 'dtolnay/rust-toolchain@stable'
      }
    ];
  }

  private createGoSetupSteps(): StepTemplate[] {
    return [
      {
        name: 'Setup Go',
        uses: 'actions/setup-go@v5',
        with: {
          'go-version': '1.21'
        }
      }
    ];
  }

  private createDependencyUpdateSteps(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const packageManagers = detectionResult.packageManagers;

    // Node.js dependency updates
    if (packageManagers.some(pm => ['npm', 'yarn', 'pnpm'].includes(pm.name))) {
      steps.push({
        name: 'Update Node.js dependencies',
        run: [
          '# Update package.json dependencies',
          'npx npm-check-updates -u',
          'npm install',
          '',
          '# Check for security vulnerabilities',
          'npm audit fix --force || true'
        ].join('\n')
      });
    }

    // Python dependency updates
    if (packageManagers.some(pm => ['pip', 'poetry', 'pipenv'].includes(pm.name))) {
      steps.push({
        name: 'Update Python dependencies',
        run: [
          '# Update requirements.txt',
          'pip install pip-tools',
          'pip-compile --upgrade requirements.in || pip-compile --upgrade requirements.txt',
          '',
          '# Update poetry dependencies',
          'if [ -f pyproject.toml ]; then',
          '  poetry update',
          'fi'
        ].join('\n')
      });
    }

    // Java dependency updates
    if (packageManagers.some(pm => ['maven', 'gradle'].includes(pm.name))) {
      steps.push({
        name: 'Update Java dependencies',
        run: [
          '# Update Maven dependencies',
          'if [ -f pom.xml ]; then',
          '  mvn versions:use-latest-versions',
          '  mvn versions:commit',
          'fi',
          '',
          '# Update Gradle dependencies',
          'if [ -f build.gradle ]; then',
          '  ./gradlew dependencyUpdates',
          'fi'
        ].join('\n')
      });
    }

    // Rust dependency updates
    if (packageManagers.some(pm => pm.name === 'cargo')) {
      steps.push({
        name: 'Update Rust dependencies',
        run: [
          'cargo update',
          'cargo audit fix || true'
        ].join('\n')
      });
    }

    // Go dependency updates
    if (packageManagers.some(pm => pm.name === 'go')) {
      steps.push({
        name: 'Update Go dependencies',
        run: [
          'go get -u ./...',
          'go mod tidy'
        ].join('\n')
      });
    }

    return steps;
  }

  private createUpdateVerificationSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Run tests after updates',
        run: 'npm test',
        continueOnError: true,
        if: "contains(github.repository, 'javascript') || contains(github.repository, 'typescript')"
      },
      {
        name: 'Run Python tests after updates',
        run: 'pytest',
        continueOnError: true,
        if: "contains(github.repository, 'python')"
      },
      {
        name: 'Run Java tests after updates',
        run: 'mvn test',
        continueOnError: true,
        if: "contains(github.repository, 'java')"
      },
      {
        name: 'Run Rust tests after updates',
        run: 'cargo test',
        continueOnError: true,
        if: "contains(github.repository, 'rust')"
      },
      {
        name: 'Run Go tests after updates',
        run: 'go test ./...',
        continueOnError: true,
        if: "contains(github.repository, 'go')"
      },
      {
        name: 'Check for breaking changes',
        run: [
          '# Simple check for common breaking changes',
          'if git diff --name-only | grep -E "(package\\.json|requirements\\.txt|Cargo\\.toml|go\\.mod|pom\\.xml)"; then',
          '  echo "BREAKING_CHANGES=true" >> $GITHUB_ENV',
          'else',
          '  echo "BREAKING_CHANGES=false" >> $GITHUB_ENV',
          'fi'
        ].join('\n')
      }
    ];
  }

  private createSecurityScanSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Run security audit',
        run: 'npm audit --audit-level=moderate',
        continueOnError: true,
        if: "contains(github.repository, 'javascript') || contains(github.repository, 'typescript')"
      },
      {
        name: 'Run Python security scan',
        run: [
          'pip install safety',
          'safety check'
        ].join('\n'),
        continueOnError: true,
        if: "contains(github.repository, 'python')"
      },
      {
        name: 'Run Rust security audit',
        run: [
          'cargo install cargo-audit',
          'cargo audit'
        ].join('\n'),
        continueOnError: true,
        if: "contains(github.repository, 'rust')"
      },
      {
        name: 'Run Go security scan',
        run: [
          'go install golang.org/x/vuln/cmd/govulncheck@latest',
          'govulncheck ./...'
        ].join('\n'),
        continueOnError: true,
        if: "contains(github.repository, 'go')"
      }
    ];
  }

  private createSecurityPatchSteps(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): StepTemplate[] {
    return [
      {
        name: 'Apply security patches',
        run: [
          '# Apply automatic security fixes',
          'npm audit fix || true',
          '',
          '# Update to secure versions',
          'if [ -f package.json ]; then',
          '  npx npm-check-updates --target minor -u',
          '  npm install',
          'fi'
        ].join('\n'),
        if: "contains(github.repository, 'javascript') || contains(github.repository, 'typescript')"
      },
      {
        name: 'Apply Python security patches',
        run: [
          '# Update to secure versions',
          'pip install --upgrade pip',
          'pip-audit --fix || true'
        ].join('\n'),
        if: "contains(github.repository, 'python')"
      },
      {
        name: 'Apply Rust security patches',
        run: [
          'cargo audit fix || true',
          'cargo update'
        ].join('\n'),
        if: "contains(github.repository, 'rust')"
      }
    ];
  }

  private createSecurityVerificationSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Verify security fixes',
        run: [
          '# Re-run security scans to verify fixes',
          'npm audit --audit-level=high || echo "Some vulnerabilities remain"'
        ].join('\n'),
        if: "contains(github.repository, 'javascript') || contains(github.repository, 'typescript')"
      },
      {
        name: 'Generate security report',
        run: [
          'echo "# Security Patch Report" > security-report.md',
          'echo "Generated: $(date)" >> security-report.md',
          'echo "" >> security-report.md',
          '',
          '# Add vulnerability scan results',
          'npm audit --json > audit-results.json || true',
          'echo "## Vulnerability Scan Results" >> security-report.md',
          'echo "See audit-results.json for detailed results" >> security-report.md'
        ].join('\n')
      }
    ];
  }

  private createLanguageCleanupSteps(
    language: string,
    detectionResult: DetectionResult
  ): StepTemplate[] {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return [
          {
            name: 'Clean Node.js cache',
            run: [
              'npm cache clean --force',
              'rm -rf node_modules/.cache'
            ].join('\n')
          }
        ];
      
      case 'python':
        return [
          {
            name: 'Clean Python cache',
            run: [
              'find . -type d -name __pycache__ -delete',
              'find . -name "*.pyc" -delete',
              'pip cache purge'
            ].join('\n')
          }
        ];
      
      case 'rust':
        return [
          {
            name: 'Clean Rust cache',
            run: [
              'cargo clean',
              'rm -rf ~/.cargo/registry/cache'
            ].join('\n')
          }
        ];
      
      case 'go':
        return [
          {
            name: 'Clean Go cache',
            run: [
              'go clean -cache',
              'go clean -modcache'
            ].join('\n')
          }
        ];
      
      default:
        return [];
    }
  }

  private createSystemHealthSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Check repository health',
        run: [
          '# Check for common issues',
          'HEALTH_STATUS="passed"',
          '',
          '# Check for large files',
          'if find . -size +100M -type f | grep -v .git; then',
          '  echo "Warning: Large files detected"',
          '  HEALTH_STATUS="warning"',
          'fi',
          '',
          '# Check for security files',
          'if [ ! -f .github/dependabot.yml ] && [ ! -f .dependabot/config.yml ]; then',
          '  echo "Warning: No Dependabot configuration found"',
          '  HEALTH_STATUS="warning"',
          'fi',
          '',
          '# Check for CI configuration',
          'if [ ! -f .github/workflows/ci.yml ] && [ ! -f .github/workflows/ci.yaml ]; then',
          '  echo "Warning: No CI workflow found"',
          '  HEALTH_STATUS="warning"',
          'fi',
          '',
          'echo "HEALTH_STATUS=$HEALTH_STATUS" >> $GITHUB_ENV'
        ].join('\n')
      }
    ];
  }

  private createPerformanceCheckSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Check repository performance',
        run: [
          '# Check repository size',
          'REPO_SIZE=$(du -sh . | cut -f1)',
          'echo "Repository size: $REPO_SIZE"',
          '',
          '# Check for performance issues',
          'if [ -d node_modules ]; then',
          '  NODE_MODULES_SIZE=$(du -sh node_modules | cut -f1)',
          '  echo "node_modules size: $NODE_MODULES_SIZE"',
          'fi',
          '',
          '# Check git history size',
          'GIT_SIZE=$(du -sh .git | cut -f1)',
          'echo "Git history size: $GIT_SIZE"'
        ].join('\n')
      }
    ];
  }

  private createPullRequestSteps(updateType: string): StepTemplate[] {
    return [
      {
        name: 'Create Pull Request',
        uses: 'peter-evans/create-pull-request@v5',
        with: {
          token: '${{ secrets.GITHUB_TOKEN }}',
          'commit-message': `chore: ${updateType} - automated maintenance`,
          title: `🤖 Automated ${updateType.replace('-', ' ')}`,
          body: `
            ## Automated Maintenance: ${updateType.replace('-', ' ')}
            
            This PR was automatically created by the maintenance workflow.
            
            ### Changes
            - Updated dependencies to latest versions
            - Applied security patches where available
            - Verified changes with automated tests
            
            ### Testing
            - [ ] All tests pass
            - [ ] No breaking changes detected
            - [ ] Security scans pass
            
            ### Review Notes
            Please review the changes and merge if everything looks good.
            This PR can be safely auto-merged if all checks pass.
          `,
          branch: `maintenance/${updateType}-${new Date().toISOString().split('T')[0]}`,
          'delete-branch': true,
          labels: 'maintenance,dependencies,automated'
        },
        if: "github.event.inputs.createPR != 'false'"
      },
      {
        name: 'Auto-merge safe updates',
        uses: 'actions/github-script@v7',
        with: {
          script: `
            const { owner, repo } = context.repo;
            const prNumber = process.env.PR_NUMBER;
            
            if (prNumber && process.env.BREAKING_CHANGES === 'false') {
              // Enable auto-merge for safe updates
              await github.rest.pulls.createReview({
                owner,
                repo,
                pull_number: prNumber,
                event: 'APPROVE',
                body: 'Auto-approving safe maintenance updates'
              });
              
              await github.rest.pulls.merge({
                owner,
                repo,
                pull_number: prNumber,
                merge_method: 'squash'
              });
            }
          `
        },
        if: "github.event.inputs.autoMerge == 'true' && env.BREAKING_CHANGES == 'false'"
      }
    ];
  }

  private getDependencyReportScript(detectionResult: DetectionResult): string {
    return `
      echo "# Dependency Report" > DEPENDENCIES.md
      echo "Generated: $(date)" >> DEPENDENCIES.md
      echo "" >> DEPENDENCIES.md
      
      # Node.js dependencies
      if [ -f package.json ]; then
        echo "## Node.js Dependencies" >> DEPENDENCIES.md
        npm list --depth=0 >> DEPENDENCIES.md 2>/dev/null || true
        echo "" >> DEPENDENCIES.md
      fi
      
      # Python dependencies
      if [ -f requirements.txt ]; then
        echo "## Python Dependencies" >> DEPENDENCIES.md
        pip list >> DEPENDENCIES.md
        echo "" >> DEPENDENCIES.md
      fi
      
      # Rust dependencies
      if [ -f Cargo.toml ]; then
        echo "## Rust Dependencies" >> DEPENDENCIES.md
        cargo tree >> DEPENDENCIES.md
        echo "" >> DEPENDENCIES.md
      fi
      
      # Go dependencies
      if [ -f go.mod ]; then
        echo "## Go Dependencies" >> DEPENDENCIES.md
        go list -m all >> DEPENDENCIES.md
        echo "" >> DEPENDENCIES.md
      fi
    `;
  }

  private createDetectionSummary(detectionResult: DetectionResult): string {
    const languages = detectionResult.languages.map(l => l.name).join(', ');
    const packageManagers = detectionResult.packageManagers.map(pm => pm.name).join(', ');
    return `Languages: ${languages}; Package Managers: ${packageManagers}`;
  }

  private getAppliedOptimizations(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): string[] {
    const optimizations: string[] = [];
    
    optimizations.push('Automated dependency updates');
    optimizations.push('Security vulnerability patching');
    optimizations.push('Repository cleanup and maintenance');
    optimizations.push('Health monitoring and reporting');
    optimizations.push('Documentation synchronization');
    optimizations.push('Pull request automation');

    return optimizations;
  }

  private getWarnings(detectionResult: DetectionResult): string[] {
    const warnings: string[] = [];
    
    if (detectionResult.packageManagers.length === 0) {
      warnings.push('No package managers detected - limited maintenance capabilities');
    }
    
    if (detectionResult.languages.length === 0) {
      warnings.push('No languages detected - using generic maintenance workflow');
    }

    return warnings;
  }

  private async renderWorkflow(workflow: WorkflowTemplate): Promise<string> {
    // This would use the YAML renderer to convert the workflow template to YAML
    // For now, returning a placeholder
    return `# Generated Maintenance Workflow\n# ${workflow.name}\n# Generated at: ${new Date().toISOString()}`;
  }
}