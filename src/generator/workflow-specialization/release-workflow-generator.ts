/**
 * Release Workflow Generator - Specialized for Release workflows
 * Focuses on versioning, changelog generation, and publishing steps
 */

import { DetectionResult, GenerationOptions, WorkflowOutput } from '../interfaces';
import { WorkflowTemplate, JobTemplate, StepTemplate, TriggerConfig } from '../types';
import { ghExpr, ghScript, ghEnvVar, ghSecret, ghNeeds, ghContext, ghStepOutput } from './github-actions-utils';

export class ReleaseWorkflowGenerator {
  /**
   * Generate release-focused workflow with versioning, changelog, and publishing
   */
  async generateReleaseWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    const workflow = this.createReleaseWorkflowTemplate(detectionResult, options);
    const content = await this.renderWorkflow(workflow);
    
    return {
      filename: 'release.yml',
      content,
      type: 'release',
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
   * Create release workflow template with versioning and publishing focus
   */
  private createReleaseWorkflowTemplate(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): WorkflowTemplate {
    return {
      name: 'Release',
      type: 'release',
      triggers: this.createReleaseTriggers(),
      jobs: this.createReleaseJobs(detectionResult, options),
      permissions: {
        contents: 'write',
        packages: 'write',
        pullRequests: 'write',
        issues: 'write'
      }
    };
  }

  /**
   * Create release-specific triggers (manual dispatch, schedule for automated releases)
   */
  private createReleaseTriggers(): TriggerConfig {
    return {
      workflowDispatch: {
        inputs: {
          releaseType: {
            description: 'Type of release',
            required: true,
            type: 'choice',
            options: ['patch', 'minor', 'major', 'prerelease']
          },
          prerelease: {
            description: 'Mark as prerelease',
            required: false,
            type: 'boolean',
            default: 'false'
          },
          draft: {
            description: 'Create as draft release',
            required: false,
            type: 'boolean',
            default: 'false'
          }
        }
      },
      schedule: [
        {
          cron: '0 10 * * 1' // Weekly automated release check on Mondays at 10 AM
        }
      ]
    };
  }

  /**
   * Create release jobs focused on versioning, changelog, and publishing
   */
  private createReleaseJobs(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate[] {
    const jobs: JobTemplate[] = [];

    // Add version preparation job
    jobs.push(this.createVersionPreparationJob(detectionResult, options));

    // Add changelog generation job
    jobs.push(this.createChangelogJob(detectionResult, options));

    // Add build and test job (ensure quality before release)
    jobs.push(this.createReleaseBuildJob(detectionResult, options));

    // Add package publishing job
    jobs.push(this.createPackagePublishingJob(detectionResult, options));

    // Add GitHub release creation job
    jobs.push(this.createGitHubReleaseJob(detectionResult, options));

    // Add post-release notification job
    jobs.push(this.createPostReleaseJob(detectionResult, options));

    return jobs;
  }

  /**
   * Create version preparation job
   */
  private createVersionPreparationJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4',
        with: {
          'fetch-depth': 0, // Full history for version calculation
          token: '${{ secrets.GITHUB_TOKEN }}'
        }
      }
    ];

    // Add language-specific setup
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    if (primaryLanguage) {
      steps.push(...this.createLanguageSetupSteps(primaryLanguage.name, detectionResult));
    }

    // Add version calculation steps
    steps.push(...this.createVersionCalculationSteps(detectionResult, options));

    // Add version update steps
    steps.push(...this.createVersionUpdateSteps(detectionResult));

    return {
      name: 'prepare-version',
      runsOn: 'ubuntu-latest',
      steps,
      outputs: {
        'new-version': '${{ steps.calculate-version.outputs.new-version }}',
        'previous-version': '${{ steps.calculate-version.outputs.previous-version }}',
        'release-notes': '${{ steps.generate-notes.outputs.release-notes }}'
      },
      if: "github.event_name == 'workflow_dispatch' || (github.event_name == 'schedule' && github.ref == 'refs/heads/main')"
    };
  }

  /**
   * Create changelog generation job
   */
  private createChangelogJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4',
        with: {
          'fetch-depth': 0,
          token: '${{ secrets.GITHUB_TOKEN }}'
        }
      },
      {
        name: 'Generate changelog',
        id: 'changelog',
        uses: 'mikepenz/release-changelog-builder-action@v4',
        with: {
          configuration: '.github/changelog-config.json',
          fromTag: '${{ needs.prepare-version.outputs.previous-version }}',
          toTag: '${{ needs.prepare-version.outputs.new-version }}',
          token: '${{ secrets.GITHUB_TOKEN }}'
        }
      },
      {
        name: 'Update CHANGELOG.md',
        run: [
          '# Create or update CHANGELOG.md',
          'if [ ! -f CHANGELOG.md ]; then',
          '  echo "# Changelog" > CHANGELOG.md',
          '  echo "" >> CHANGELOG.md',
          '  echo "All notable changes to this project will be documented in this file." >> CHANGELOG.md',
          '  echo "" >> CHANGELOG.md',
          'fi',
          '',
          '# Prepare new changelog entry',
          `NEW_ENTRY="## [${ghNeeds('prepare-version', 'new-version')}] - $(date +%Y-%m-%d)`,
          '',
          `${ghStepOutput('changelog', 'changelog')}`,
          '',
          '"',
          '',
          '# Insert new entry after the header',
          'sed -i \'/^# Changelog/r /dev/stdin\' CHANGELOG.md <<< "$NEW_ENTRY"'
        ].join('\n')
      },
      {
        name: 'Commit changelog',
        run: [
          'git config --local user.email "action@github.com"',
          'git config --local user.name "GitHub Action"',
          'git add CHANGELOG.md',
          `git commit -m "Update changelog for v${ghNeeds('prepare-version', 'new-version')}" || exit 0`,
          'git push'
        ].join('\n')
      }
    ];

    return {
      name: 'generate-changelog',
      runsOn: 'ubuntu-latest',
      steps,
      needs: ['prepare-version'],
      outputs: {
        changelog: '${{ steps.changelog.outputs.changelog }}'
      }
    };
  }

  /**
   * Create release build job with comprehensive testing
   */
  private createReleaseBuildJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      }
    ];

    // Add language-specific setup and build
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    if (primaryLanguage) {
      steps.push(...this.createLanguageSetupSteps(primaryLanguage.name, detectionResult));
      steps.push(...this.createReleaseBuildSteps(primaryLanguage.name, detectionResult));
    }

    // Add comprehensive testing
    steps.push(...this.createReleaseTestSteps(detectionResult));

    // Add security scanning
    steps.push(...this.createSecurityScanSteps(detectionResult));

    // Create release artifacts
    steps.push(...this.createReleaseArtifactSteps(detectionResult));

    return {
      name: 'build-and-test',
      runsOn: 'ubuntu-latest',
      steps,
      needs: ['prepare-version', 'generate-changelog']
    };
  }

  /**
   * Create package publishing job
   */
  private createPackagePublishingJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      },
      {
        name: 'Download release artifacts',
        uses: 'actions/download-artifact@v4',
        with: {
          name: 'release-artifacts',
          path: 'dist/'
        }
      }
    ];

    // Add language-specific publishing steps
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    if (primaryLanguage) {
      steps.push(...this.createLanguageSetupSteps(primaryLanguage.name, detectionResult));
      steps.push(...this.createPackagePublishSteps(primaryLanguage.name, detectionResult, options));
    }

    return {
      name: 'publish-packages',
      runsOn: 'ubuntu-latest',
      steps,
      needs: ['build-and-test'],
      if: "!github.event.inputs.draft || github.event.inputs.draft == 'false'"
    };
  }

  /**
   * Create GitHub release creation job
   */
  private createGitHubReleaseJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      },
      {
        name: 'Download release artifacts',
        uses: 'actions/download-artifact@v4',
        with: {
          name: 'release-artifacts',
          path: 'release-assets/'
        }
      },
      {
        name: 'Create Git tag',
        run: [
          'git config --local user.email "action@github.com"',
          'git config --local user.name "GitHub Action"',
          `git tag -a "v${ghNeeds('prepare-version', 'new-version')}" -m "Release v${ghNeeds('prepare-version', 'new-version')}"`,
          `git push origin "v${ghNeeds('prepare-version', 'new-version')}"`
        ].join('\n')
      },
      {
        name: 'Create GitHub Release',
        uses: 'softprops/action-gh-release@v1',
        with: {
          tag_name: `v${ghNeeds('prepare-version', 'new-version')}`,
          name: `Release v${ghNeeds('prepare-version', 'new-version')}`,
          body: ghNeeds('generate-changelog', 'changelog'),
          draft: ghExpr('github.event.inputs.draft || false'),
          prerelease: ghExpr('github.event.inputs.prerelease || false'),
          files: 'release-assets/*',
          token: '${{ secrets.GITHUB_TOKEN }}'
        }
      }
    ];

    return {
      name: 'create-release',
      runsOn: 'ubuntu-latest',
      steps,
      needs: ['prepare-version', 'generate-changelog', 'build-and-test', 'publish-packages']
    };
  }

  /**
   * Create post-release notification and cleanup job
   */
  private createPostReleaseJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Notify release completion',
        uses: 'actions/github-script@v7',
        with: {
          script: [
            'const { owner, repo } = context.repo;',
            `const releaseVersion = '${ghNeeds('prepare-version', 'new-version')}';`,
            '',
            '// Create issue for release announcement',
            'await github.rest.issues.create({',
            '  owner,',
            '  repo,',
            '  title: `🎉 Release v${releaseVersion} is now available!`,',
            '  body: `',
            '  ## Release v${releaseVersion} has been published!',
            '  ',
            '  ### What\'s New',
            `  ${ghNeeds('generate-changelog', 'changelog')}`,
            '  ',
            '  ### Installation',
            '  Check the [release page](https://github.com/${owner}/${repo}/releases/tag/v${releaseVersion}) for installation instructions.',
            '  ',
            '  ### Feedback',
            '  Please report any issues or provide feedback in our [discussions](https://github.com/${owner}/${repo}/discussions).',
            '  `,',
            '  labels: [\'release\', \'announcement\']',
            '});'
          ].join('\n')
        }
      },
      {
        name: 'Update documentation',
        run: [
          '# Update version in documentation',
          'if [ -f README.md ]; then',
          `  sed -i 's/version-[0-9.]*/version-${ghNeeds('prepare-version', 'new-version')}/g' README.md`,
          'fi',
          '',
          '# Update version badges',
          'if [ -f README.md ]; then',
          `  sed -i 's/v[0-9.]*/v${ghNeeds('prepare-version', 'new-version')}/g' README.md`,
          'fi'
        ].join('\n')
      },
      {
        name: 'Trigger documentation update',
        uses: 'peter-evans/repository-dispatch@v3',
        with: {
          token: '${{ secrets.GITHUB_TOKEN }}',
          'event-type': 'docs-update',
          'client-payload': `{"version": "${ghNeeds('prepare-version', 'new-version')}"}`
        }
      }
    ];

    return {
      name: 'post-release',
      runsOn: 'ubuntu-latest',
      steps,
      needs: ['prepare-version', 'generate-changelog', 'create-release'],
      if: 'always() && needs.create-release.result == \'success\''
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
          cache: packageManager,
          'registry-url': 'https://registry.npmjs.org'
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
        name: 'Install build dependencies',
        run: 'pip install build twine'
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
      },
      {
        name: 'Install cargo-release',
        run: 'cargo install cargo-release'
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

  private createVersionCalculationSteps(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): StepTemplate[] {
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    
    return [
      {
        name: 'Calculate version',
        id: 'calculate-version',
        run: this.getVersionCalculationScript(primaryLanguage?.name || 'generic')
      },
      {
        name: 'Generate release notes',
        id: 'generate-notes',
        run: [
          '# Generate preliminary release notes',
          'git log --pretty=format:"- %s" $(git describe --tags --abbrev=0)..HEAD > release-notes.txt',
          'echo "release-notes<<EOF" >> $GITHUB_OUTPUT',
          'cat release-notes.txt >> $GITHUB_OUTPUT',
          'echo "EOF" >> $GITHUB_OUTPUT'
        ].join('\n')
      }
    ];
  }

  private createVersionUpdateSteps(detectionResult: DetectionResult): StepTemplate[] {
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    
    switch (primaryLanguage?.name.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return [
          {
            name: 'Update package.json version',
            run: [
              `npm version ${ghStepOutput('calculate-version', 'new-version')} --no-git-tag-version`,
              'git config --local user.email "action@github.com"',
              'git config --local user.name "GitHub Action"',
              'git add package.json package-lock.json',
              `git commit -m "Bump version to ${ghStepOutput('calculate-version', 'new-version')}"`,
              'git push'
            ].join('\n')
          }
        ];
      
      case 'python':
        return [
          {
            name: 'Update Python version',
            run: [
              '# Update version in pyproject.toml or setup.py',
              'if [ -f pyproject.toml ]; then',
              `  sed -i 's/version = "[^"]*"/version = "${ghStepOutput('calculate-version', 'new-version')}"/' pyproject.toml`,
              'elif [ -f setup.py ]; then',
              `  sed -i 's/version="[^"]*"/version="${ghStepOutput('calculate-version', 'new-version')}"/' setup.py`,
              'fi',
              '',
              'git config --local user.email "action@github.com"',
              'git config --local user.name "GitHub Action"',
              'git add pyproject.toml setup.py',
              `git commit -m "Bump version to ${ghStepOutput('calculate-version', 'new-version')}"`,
              'git push'
            ].join('\n')
          }
        ];
      
      case 'java':
        return [
          {
            name: 'Update Maven version',
            run: [
              `mvn versions:set -DnewVersion=${ghStepOutput('calculate-version', 'new-version')}`,
              'mvn versions:commit',
              '',
              'git config --local user.email "action@github.com"',
              'git config --local user.name "GitHub Action"',
              'git add pom.xml',
              `git commit -m "Bump version to ${ghStepOutput('calculate-version', 'new-version')}"`,
              'git push'
            ].join('\n')
          }
        ];
      
      case 'rust':
        return [
          {
            name: 'Update Cargo version',
            run: [
              `sed -i 's/version = "[^"]*"/version = "${ghStepOutput('calculate-version', 'new-version')}"/' Cargo.toml`,
              '',
              'git config --local user.email "action@github.com"',
              'git config --local user.name "GitHub Action"',
              'git add Cargo.toml Cargo.lock',
              `git commit -m "Bump version to ${ghStepOutput('calculate-version', 'new-version')}"`,
              'git push'
            ].join('\n')
          }
        ];
      
      default:
        return [];
    }
  }

  private createReleaseBuildSteps(
    language: string,
    detectionResult: DetectionResult
  ): StepTemplate[] {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return [
          {
            name: 'Build for production',
            run: 'npm run build',
            env: {
              NODE_ENV: 'production'
            }
          }
        ];
      
      case 'python':
        return [
          {
            name: 'Build Python package',
            run: 'python -m build'
          }
        ];
      
      case 'java':
        const buildTool = detectionResult.buildTools.find(bt => 
          ['maven', 'gradle'].includes(bt.name)
        )?.name || 'maven';
        return [
          {
            name: 'Build with ' + buildTool,
            run: buildTool === 'maven' ? 'mvn clean package' : './gradlew build'
          }
        ];
      
      case 'rust':
        return [
          {
            name: 'Build Rust release',
            run: 'cargo build --release'
          }
        ];
      
      case 'go':
        return [
          {
            name: 'Build Go application',
            run: [
              '# Build for multiple platforms',
              'GOOS=linux GOARCH=amd64 go build -o bin/app-linux-amd64 ./cmd/app',
              'GOOS=darwin GOARCH=amd64 go build -o bin/app-darwin-amd64 ./cmd/app',
              'GOOS=windows GOARCH=amd64 go build -o bin/app-windows-amd64.exe ./cmd/app'
            ].join('\n')
          }
        ];
      
      default:
        return [];
    }
  }

  private createReleaseTestSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Run comprehensive tests',
        run: 'npm test -- --coverage --ci',
        if: "contains(github.repository, 'javascript') || contains(github.repository, 'typescript')"
      },
      {
        name: 'Run Python tests',
        run: 'pytest --cov=src --cov-report=xml',
        if: "contains(github.repository, 'python')"
      },
      {
        name: 'Run Java tests',
        run: 'mvn test',
        if: "contains(github.repository, 'java')"
      },
      {
        name: 'Run Rust tests',
        run: 'cargo test --release',
        if: "contains(github.repository, 'rust')"
      },
      {
        name: 'Run Go tests',
        run: 'go test -v ./...',
        if: "contains(github.repository, 'go')"
      }
    ];
  }

  private createSecurityScanSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Run security audit',
        run: 'npm audit --audit-level=high',
        continueOnError: true,
        if: "contains(github.repository, 'javascript') || contains(github.repository, 'typescript')"
      },
      {
        name: 'Run Python security scan',
        run: 'pip-audit',
        continueOnError: true,
        if: "contains(github.repository, 'python')"
      },
      {
        name: 'Run Rust security audit',
        run: 'cargo audit',
        continueOnError: true,
        if: "contains(github.repository, 'rust')"
      }
    ];
  }

  private createReleaseArtifactSteps(detectionResult: DetectionResult): StepTemplate[] {
    return [
      {
        name: 'Create release artifacts',
        run: [
          'mkdir -p release-artifacts',
          '',
          '# Copy build outputs',
          'if [ -d "dist" ]; then',
          '  cp -r dist/* release-artifacts/',
          'fi',
          '',
          'if [ -d "build" ]; then',
          '  cp -r build/* release-artifacts/',
          'fi',
          '',
          'if [ -d "target" ]; then',
          '  cp -r target/release/* release-artifacts/ 2>/dev/null || true',
          'fi',
          '',
          'if [ -d "bin" ]; then',
          '  cp -r bin/* release-artifacts/',
          'fi',
          '',
          '# Create checksums',
          'cd release-artifacts',
          'find . -type f -exec sha256sum {} \\; > checksums.txt'
        ].join('\n')
      },
      {
        name: 'Upload release artifacts',
        uses: 'actions/upload-artifact@v4',
        with: {
          name: 'release-artifacts',
          path: 'release-artifacts/',
          'retention-days': 90
        }
      }
    ];
  }

  private createPackagePublishSteps(
    language: string,
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): StepTemplate[] {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return [
          {
            name: 'Publish to npm',
            run: 'npm publish',
            env: {
              NODE_AUTH_TOKEN: '${{ secrets.NPM_TOKEN }}'
            }
          }
        ];
      
      case 'python':
        return [
          {
            name: 'Publish to PyPI',
            run: 'twine upload dist/*',
            env: {
              TWINE_USERNAME: '__token__',
              TWINE_PASSWORD: '${{ secrets.PYPI_TOKEN }}'
            }
          }
        ];
      
      case 'java':
        return [
          {
            name: 'Publish to Maven Central',
            run: 'mvn deploy',
            env: {
              MAVEN_USERNAME: '${{ secrets.MAVEN_USERNAME }}',
              MAVEN_PASSWORD: '${{ secrets.MAVEN_PASSWORD }}'
            }
          }
        ];
      
      case 'rust':
        return [
          {
            name: 'Publish to crates.io',
            run: 'cargo publish',
            env: {
              CARGO_REGISTRY_TOKEN: '${{ secrets.CARGO_TOKEN }}'
            }
          }
        ];
      
      case 'go':
        return [
          {
            name: 'Create Go module release',
            run: [
              '# Go modules are published via Git tags',
              `echo "Go module will be available at: go get github.com/${ghContext.repository}@v${ghNeeds('prepare-version', 'new-version')}"`
            ].join('\n')
          }
        ];
      
      default:
        return [];
    }
  }

  private getVersionCalculationScript(language: string): string {
    return `
      # Get current version
      CURRENT_VERSION=""
      case "${language.toLowerCase()}" in
        "javascript"|"typescript")
          CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0")
          ;;
        "python")
          CURRENT_VERSION=$(python -c "import toml; print(toml.load('pyproject.toml')['project']['version'])" 2>/dev/null || echo "0.0.0")
          ;;
        "java")
          CURRENT_VERSION=$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout 2>/dev/null || echo "0.0.0")
          ;;
        "rust")
          CURRENT_VERSION=$(grep '^version' Cargo.toml | head -1 | sed 's/version = "\\(.*\\)"/\\1/' || echo "0.0.0")
          ;;
        *)
          CURRENT_VERSION=$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo "0.0.0")
          ;;
      esac
      
      echo "Current version: $CURRENT_VERSION"
      
      # Calculate new version based on release type
      RELEASE_TYPE="\${{ github.event.inputs.releaseType || 'patch' }}"
      
      IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
      MAJOR=\${VERSION_PARTS[0]:-0}
      MINOR=\${VERSION_PARTS[1]:-0}
      PATCH=\${VERSION_PARTS[2]:-0}
      
      case "$RELEASE_TYPE" in
        "major")
          MAJOR=$((MAJOR + 1))
          MINOR=0
          PATCH=0
          ;;
        "minor")
          MINOR=$((MINOR + 1))
          PATCH=0
          ;;
        "patch")
          PATCH=$((PATCH + 1))
          ;;
        "prerelease")
          PATCH=$((PATCH + 1))
          NEW_VERSION="$MAJOR.$MINOR.$PATCH-rc.1"
          ;;
      esac
      
      if [ "$RELEASE_TYPE" != "prerelease" ]; then
        NEW_VERSION="$MAJOR.$MINOR.$PATCH"
      fi
      
      echo "New version: $NEW_VERSION"
      echo "new-version=$NEW_VERSION" >> $GITHUB_OUTPUT
      echo "previous-version=$CURRENT_VERSION" >> $GITHUB_OUTPUT
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
    
    optimizations.push('Automated version calculation and updating');
    optimizations.push('Comprehensive changelog generation');
    optimizations.push('Multi-platform artifact creation');
    optimizations.push('Security scanning before release');
    optimizations.push('Automated package publishing');
    optimizations.push('Post-release documentation updates');

    return optimizations;
  }

  private getWarnings(detectionResult: DetectionResult): string[] {
    const warnings: string[] = [];
    
    if (detectionResult.packageManagers.length === 0) {
      warnings.push('No package managers detected - manual publishing may be required');
    }
    
    if (detectionResult.languages.length === 0) {
      warnings.push('No languages detected - using generic release workflow');
    }

    return warnings;
  }

  private async renderWorkflow(workflow: WorkflowTemplate): Promise<string> {
    // This would use the YAML renderer to convert the workflow template to YAML
    // For now, returning a placeholder
    return `# Generated Release Workflow\n# ${workflow.name}\n# Generated at: ${new Date().toISOString()}`;
  }
}