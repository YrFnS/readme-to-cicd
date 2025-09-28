/**
 * Progress Indicator for CLI Operations
 * 
 * Provides professional progress feedback during long-running operations
 */

export interface ProgressStep {
  name: string;
  description: string;
  duration?: number; // Expected duration in ms
}

export class ProgressIndicator {
  private currentStep: number = 0;
  private totalSteps: number = 0;
  private steps: ProgressStep[] = [];
  private startTime: number = 0;
  private stepStartTime: number = 0;
  private isQuiet: boolean = false;

  constructor(steps: ProgressStep[], quiet: boolean = false) {
    this.steps = steps;
    this.totalSteps = steps.length;
    this.isQuiet = quiet;
    this.startTime = Date.now();
  }

  /**
   * Start the next step
   */
  nextStep(): void {
    if (this.isQuiet) return;

    if (this.currentStep > 0) {
      // Complete previous step
      const duration = Date.now() - this.stepStartTime;
      const durationStr = duration > 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`;
      console.log(`✅ ${this.steps[this.currentStep - 1].name} complete (${durationStr})`);
    }

    if (this.currentStep < this.totalSteps) {
      const step = this.steps[this.currentStep];
      this.stepStartTime = Date.now();
      
      console.log(`⠋ ${step.description}... (${this.currentStep + 1}/${this.totalSteps})`);
      this.currentStep++;
    }
  }

  /**
   * Mark current step as complete with custom message
   */
  completeStep(message?: string): void {
    if (this.isQuiet) return;

    const duration = Date.now() - this.stepStartTime;
    const durationStr = duration > 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`;
    
    if (this.currentStep > 0) {
      const stepName = message || this.steps[this.currentStep - 1].name;
      console.log(`✅ ${stepName} (${durationStr})`);
    }
  }

  /**
   * Mark current step as warning
   */
  warnStep(message: string, fallbackMessage?: string): void {
    if (this.isQuiet) return;

    const duration = Date.now() - this.stepStartTime;
    const durationStr = duration > 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`;
    
    console.log(`⚠️  ${message} (${durationStr})`);
    if (fallbackMessage) {
      console.log(`🔄 ${fallbackMessage}`);
    }
  }

  /**
   * Complete all progress and show summary
   */
  complete(successMessage?: string): void {
    if (this.isQuiet) return;

    // Complete any remaining step
    if (this.currentStep > 0 && this.currentStep <= this.totalSteps) {
      this.completeStep();
    }

    const totalDuration = Date.now() - this.startTime;
    const totalDurationStr = totalDuration > 1000 ? `${(totalDuration / 1000).toFixed(1)}s` : `${totalDuration}ms`;
    
    console.log('');
    if (successMessage) {
      console.log(`🎉 ${successMessage} (${totalDurationStr} total)`);
    } else {
      console.log(`✅ Operation completed (${totalDurationStr} total)`);
    }
  }

  /**
   * Show error and cleanup
   */
  error(errorMessage: string): void {
    if (this.isQuiet) return;

    const totalDuration = Date.now() - this.startTime;
    const totalDurationStr = totalDuration > 1000 ? `${(totalDuration / 1000).toFixed(1)}s` : `${totalDuration}ms`;
    
    console.log('');
    console.log(`❌ ${errorMessage} (${totalDurationStr} total)`);
  }

  /**
   * Update current step description
   */
  updateStep(newDescription: string): void {
    if (this.isQuiet) return;

    // Clear current line and show updated description
    process.stdout.write('\r\x1b[K'); // Clear line
    console.log(`⠋ ${newDescription}... (${this.currentStep}/${this.totalSteps})`);
  }
}