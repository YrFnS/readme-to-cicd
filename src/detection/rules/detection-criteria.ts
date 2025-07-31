import { DetectionCriteria, PackageFilePattern, DependencyPattern, FilePattern, CommandPattern, TextPattern } from '../interfaces/detection-rules';
import { ProjectInfo } from '../interfaces/framework-detector';
import { Evidence } from '../interfaces/evidence';

/**
 * Detection criteria evaluation utilities
 */
export class DetectionCriteriaEvaluator {
  /**
   * Evaluate detection criteria against project information
   */
  evaluateCriteria(criteria: DetectionCriteria, projectInfo: ProjectInfo): {
    matches: boolean;
    confidence: number;
    evidence: Evidence[];
  } {
    const evidence: Evidence[] = [];
    let totalWeight = 0;
    let maxPossibleWeight = 0;

    // Evaluate package file patterns
    if (criteria.packageFiles) {
      const { weight, maxWeight, packageEvidence } = this.evaluatePackageFiles(criteria.packageFiles, projectInfo);
      totalWeight += weight;
      maxPossibleWeight += maxWeight;
      evidence.push(...packageEvidence);
    }

    // Evaluate dependency patterns
    if (criteria.dependencies) {
      const { weight, maxWeight, depEvidence } = this.evaluateDependencies(criteria.dependencies, projectInfo);
      totalWeight += weight;
      maxPossibleWeight += maxWeight;
      evidence.push(...depEvidence);
    }

    // Evaluate file patterns
    if (criteria.filePatterns) {
      const { weight, maxWeight, fileEvidence } = this.evaluateFilePatterns(criteria.filePatterns, projectInfo);
      totalWeight += weight;
      maxPossibleWeight += maxWeight;
      evidence.push(...fileEvidence);
    }

    // Evaluate command patterns
    if (criteria.commandPatterns) {
      const { weight, maxWeight, cmdEvidence } = this.evaluateCommandPatterns(criteria.commandPatterns, projectInfo);
      totalWeight += weight;
      maxPossibleWeight += maxWeight;
      evidence.push(...cmdEvidence);
    }

    // Evaluate text patterns
    if (criteria.textPatterns) {
      const { weight, maxWeight, textEvidence } = this.evaluateTextPatterns(criteria.textPatterns, projectInfo);
      totalWeight += weight;
      maxPossibleWeight += maxWeight;
      evidence.push(...textEvidence);
    }

    const confidence = maxPossibleWeight > 0 ? totalWeight / maxPossibleWeight : 0;
    const matches = confidence >= (criteria.minimumConfidence || 0.5);

    return { matches, confidence, evidence };
  }

  /**
   * Evaluate package file patterns
   */
  private evaluatePackageFiles(patterns: PackageFilePattern[], projectInfo: ProjectInfo): {
    weight: number;
    maxWeight: number;
    packageEvidence: Evidence[];
  } {
    let weight = 0;
    let maxWeight = 0;
    const packageEvidence: Evidence[] = [];

    patterns.forEach(pattern => {
      maxWeight += pattern.weight;
      
      const hasFile = projectInfo.configFiles.some(file => 
        file.toLowerCase().includes(pattern.fileName.toLowerCase())
      );
      
      if (hasFile) {
        weight += pattern.weight;
        packageEvidence.push({
          type: 'config_file',
          source: 'package_files',
          value: pattern.fileName,
          weight: pattern.weight,
          location: { filePath: pattern.fileName }
        });
      }
    });

    return { weight, maxWeight, packageEvidence };
  }

  /**
   * Evaluate dependency patterns
   */
  private evaluateDependencies(patterns: DependencyPattern[], projectInfo: ProjectInfo): {
    weight: number;
    maxWeight: number;
    depEvidence: Evidence[];
  } {
    let weight = 0;
    let maxWeight = 0;
    const depEvidence: Evidence[] = [];

    patterns.forEach(pattern => {
      maxWeight += pattern.weight;
      
      const hasDependency = projectInfo.dependencies.some(dep => {
        const regex = new RegExp(pattern.packageName, 'i');
        return regex.test(dep);
      });
      
      if (hasDependency) {
        weight += pattern.weight;
        depEvidence.push({
          type: 'dependency',
          source: 'project_dependencies',
          value: pattern.packageName,
          weight: pattern.weight,
          context: { dependencyType: pattern.dependencyType }
        });
      }
    });

    return { weight, maxWeight, depEvidence };
  }

  /**
   * Evaluate file patterns
   */
  private evaluateFilePatterns(patterns: FilePattern[], projectInfo: ProjectInfo): {
    weight: number;
    maxWeight: number;
    fileEvidence: Evidence[];
  } {
    let weight = 0;
    let maxWeight = 0;
    const fileEvidence: Evidence[] = [];

    patterns.forEach(pattern => {
      maxWeight += pattern.weight;
      
      const hasFile = projectInfo.configFiles.some(file => {
        const regex = new RegExp(pattern.path.replace('*', '.*'), 'i');
        return regex.test(file);
      });
      
      if (hasFile) {
        weight += pattern.weight;
        fileEvidence.push({
          type: 'file_pattern',
          source: 'config_files',
          value: pattern.path,
          weight: pattern.weight,
          location: { filePath: pattern.path }
        });
      }
    });

    return { weight, maxWeight, fileEvidence };
  }

  /**
   * Evaluate command patterns
   */
  private evaluateCommandPatterns(patterns: CommandPattern[], projectInfo: ProjectInfo): {
    weight: number;
    maxWeight: number;
    cmdEvidence: Evidence[];
  } {
    let weight = 0;
    let maxWeight = 0;
    const cmdEvidence: Evidence[] = [];

    patterns.forEach(pattern => {
      maxWeight += pattern.weight;
      
      const allCommands = [...projectInfo.buildCommands, ...projectInfo.testCommands];
      const hasCommand = allCommands.some(cmd => {
        const regex = new RegExp(pattern.command, 'i');
        return regex.test(cmd);
      });
      
      if (hasCommand) {
        weight += pattern.weight;
        cmdEvidence.push({
          type: 'command_pattern',
          source: 'project_commands',
          value: pattern.command,
          weight: pattern.weight,
          context: { commandContext: pattern.context }
        });
      }
    });

    return { weight, maxWeight, cmdEvidence };
  }

  /**
   * Evaluate text patterns
   */
  private evaluateTextPatterns(patterns: TextPattern[], projectInfo: ProjectInfo): {
    weight: number;
    maxWeight: number;
    textEvidence: Evidence[];
  } {
    let weight = 0;
    let maxWeight = 0;
    const textEvidence: Evidence[] = [];

    patterns.forEach(pattern => {
      maxWeight += pattern.weight;
      
      const flags = pattern.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern.pattern, flags);
      const hasMatch = regex.test(projectInfo.rawContent);
      
      if (hasMatch) {
        weight += pattern.weight;
        textEvidence.push({
          type: 'text_mention',
          source: 'readme_content',
          value: pattern.pattern,
          weight: pattern.weight,
          context: { 
            textContext: pattern.context,
            caseSensitive: pattern.caseSensitive 
          }
        });
      }
    });

    return { weight, maxWeight, textEvidence };
  }
}