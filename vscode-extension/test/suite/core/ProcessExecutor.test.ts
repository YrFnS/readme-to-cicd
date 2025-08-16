/**
 * Process Executor Tests
 * 
 * Tests for the ProcessExecutor class including command execution,
 * timeout handling, and progress reporting.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { ProcessExecutor } from '../../../src/core/ProcessExecutor';
import { ProcessExecutionOptions, CLIProgressReport } from '../../../src/core/types';

suite('Process Executor Tests', () => {
  let processExecutor: ProcessExecutor;
  let spawnStub: sinon.SinonStub;
  let mockChildProcess: any;

  setup(() => {
    // Create mock child process
    mockChildProcess = {
      stdout: { on: sinon.stub() },
      stderr: { on: sinon.stub() },
      on: sinon.stub(),
      kill: sinon.stub()
    };

    // Stub spawn function
    spawnStub = sinon.stub(require('child_process'), 'spawn');
    spawnStub.returns(mockChildProcess);

    processExecutor = new ProcessExecutor({
      defaultTimeout: 5000,
      enableLogging: false
    });
  });

  teardown(() => {
    sinon.restore();
    processExecutor.dispose();
  });

  suite('executeCommand', () => {
    test('should execute command successfully', async () => {
      const options: ProcessExecutionOptions = {
        command: 'echo',
        args: ['hello'],
        timeout: 1000
      };

      // Setup successful execution
      mockChildProcess.stdout.on.withArgs('data').callsArgWith(1, Buffer.from('hello\n'));
      mockChildProcess.on.withArgs('close').callsArgWith(1, 0, null);

      const result = await processExecutor.executeCommand(options);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.stdout, 'hello');
      assert.strictEqual(result.exitCode, 0);
      assert.strictEqual(result.timedOut, false);
    });

    test('should handle command failure', async () => {
      const options: ProcessExecutionOptions = {
        command: 'false',
        args: [],
        timeout: 1000
      };

      // Setup failed execution
      mockChildProcess.stderr.on.withArgs('data').callsArgWith(1, Buffer.from('error\n'));
      mockChildProcess.on.withArgs('close').callsArgWith(1, 1, null);

      const result = await processExecutor.executeCommand(options);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.stderr, 'error');
      assert.strictEqual(result.exitCode, 1);
    });

    test('should handle timeout', async () => {
      const options: ProcessExecutionOptions = {
        command: 'sleep',
        args: ['10'],
        timeout: 100
      };

      // Setup timeout scenario - don't call close event
      const result = await processExecutor.executeCommand(options);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.timedOut, true);
      assert(result.stderr.includes('timed out'));
      assert(mockChildProcess.kill.calledWith('SIGTERM'));
    });

    test('should handle process error', async () => {
      const options: ProcessExecutionOptions = {
        command: 'nonexistent',
        args: [],
        timeout: 1000
      };

      // Setup process error
      mockChildProcess.on.withArgs('error').callsArgWith(1, new Error('Command not found'));

      const result = await processExecutor.executeCommand(options);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.stderr, 'Command not found');
      assert.strictEqual(result.exitCode, -1);
    });

    test('should report progress from output', async () => {
      const options: ProcessExecutionOptions = {
        command: 'echo',
        args: ['Parsing README'],
        timeout: 1000
      };

      const progressReports: CLIProgressReport[] = [];
      const progressCallback = (report: CLIProgressReport) => {
        progressReports.push(report);
      };

      // Setup output with progress indicators
      mockChildProcess.stdout.on.withArgs('data').callsArgWith(1, Buffer.from('Parsing README\n'));
      mockChildProcess.on.withArgs('close').callsArgWith(1, 0, null);

      await processExecutor.executeCommand(options, progressCallback);

      assert(progressReports.length > 0);
      assert.strictEqual(progressReports[0].stage, 'parsing');
      assert.strictEqual(progressReports[0].progress, 25);
    });
  });

  suite('executeCLICommand', () => {
    test('should execute CLI command with correct arguments', async () => {
      // Mock CLI path resolution
      const resolveCLIPathStub = sinon.stub(processExecutor as any, 'resolveCLIPath');
      resolveCLIPathStub.resolves('readme-to-cicd');

      // Setup successful execution
      mockChildProcess.stdout.on.withArgs('data').callsArgWith(1, Buffer.from('success\n'));
      mockChildProcess.on.withArgs('close').callsArgWith(1, 0, null);

      const result = await processExecutor.executeCLICommand(
        'generate',
        ['--readme', 'README.md'],
        '/project/path'
      );

      assert.strictEqual(result.success, true);
      assert(spawnStub.calledOnce);
      
      const spawnCall = spawnStub.getCall(0);
      assert.strictEqual(spawnCall.args[0], 'readme-to-cicd');
      assert.deepStrictEqual(spawnCall.args[1], ['generate', '--readme', 'README.md']);
    });

    test('should handle CLI command failure', async () => {
      const resolveCLIPathStub = sinon.stub(processExecutor as any, 'resolveCLIPath');
      resolveCLIPathStub.resolves('readme-to-cicd');

      // Setup failed execution
      mockChildProcess.stderr.on.withArgs('data').callsArgWith(1, Buffer.from('CLI error\n'));
      mockChildProcess.on.withArgs('close').callsArgWith(1, 1, null);

      const result = await processExecutor.executeCLICommand('generate', []);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.stderr, 'CLI error');
      assert.strictEqual(result.exitCode, 1);
    });
  });

  suite('Command Validation', () => {
    test('should validate command options', async () => {
      const invalidOptions: ProcessExecutionOptions = {
        command: '',
        args: [],
        timeout: 1000
      };

      try {
        await processExecutor.executeCommand(invalidOptions);
        assert.fail('Should have thrown validation error');
      } catch (error) {
        assert(error instanceof Error);
        assert(error.message.includes('Command is required'));
      }
    });

    test('should validate timeout', async () => {
      const invalidOptions: ProcessExecutionOptions = {
        command: 'echo',
        args: ['test'],
        timeout: -1
      };

      try {
        await processExecutor.executeCommand(invalidOptions);
        assert.fail('Should have thrown validation error');
      } catch (error) {
        assert(error instanceof Error);
        assert(error.message.includes('Timeout must be positive'));
      }
    });

    test('should validate arguments array', async () => {
      const invalidOptions: any = {
        command: 'echo',
        args: 'not-an-array',
        timeout: 1000
      };

      try {
        await processExecutor.executeCommand(invalidOptions);
        assert.fail('Should have thrown validation error');
      } catch (error) {
        assert(error instanceof Error);
        assert(error.message.includes('Arguments must be an array'));
      }
    });
  });

  suite('Process Management', () => {
    test('should track active processes', async () => {
      const options: ProcessExecutionOptions = {
        command: 'sleep',
        args: ['1'],
        timeout: 5000
      };

      // Start execution but don't complete it immediately
      const executionPromise = processExecutor.executeCommand(options);

      // Check that process is tracked
      assert.strictEqual(processExecutor.getActiveProcessCount(), 1);

      // Complete the process
      mockChildProcess.on.withArgs('close').callsArgWith(1, 0, null);
      await executionPromise;

      // Check that process is no longer tracked
      assert.strictEqual(processExecutor.getActiveProcessCount(), 0);
    });

    test('should kill all active processes', async () => {
      const options: ProcessExecutionOptions = {
        command: 'sleep',
        args: ['10'],
        timeout: 1000
      };

      // Start multiple processes
      processExecutor.executeCommand(options);
      processExecutor.executeCommand(options);

      assert.strictEqual(processExecutor.getActiveProcessCount(), 2);

      await processExecutor.killAllProcesses();

      assert.strictEqual(processExecutor.getActiveProcessCount(), 0);
      assert(mockChildProcess.kill.calledTwice);
    });
  });

  suite('Progress Parsing', () => {
    test('should parse parsing stage from output', async () => {
      const progressReports: CLIProgressReport[] = [];
      const progressCallback = (report: CLIProgressReport) => {
        progressReports.push(report);
      };

      const options: ProcessExecutionOptions = {
        command: 'echo',
        args: ['test'],
        timeout: 1000
      };

      mockChildProcess.stdout.on.withArgs('data').callsArgWith(1, Buffer.from('Parsing README file...\n'));
      mockChildProcess.on.withArgs('close').callsArgWith(1, 0, null);

      await processExecutor.executeCommand(options, progressCallback);

      const parsingReport = progressReports.find(r => r.stage === 'parsing');
      assert(parsingReport);
      assert.strictEqual(parsingReport.progress, 25);
      assert.strictEqual(parsingReport.message, 'Parsing README file...');
    });

    test('should parse detection stage from output', async () => {
      const progressReports: CLIProgressReport[] = [];
      const progressCallback = (report: CLIProgressReport) => {
        progressReports.push(report);
      };

      const options: ProcessExecutionOptions = {
        command: 'echo',
        args: ['test'],
        timeout: 1000
      };

      mockChildProcess.stdout.on.withArgs('data').callsArgWith(1, Buffer.from('Detecting frameworks...\n'));
      mockChildProcess.on.withArgs('close').callsArgWith(1, 0, null);

      await processExecutor.executeCommand(options, progressCallback);

      const detectionReport = progressReports.find(r => r.stage === 'detection');
      assert(detectionReport);
      assert.strictEqual(detectionReport.progress, 50);
    });

    test('should parse generation stage from output', async () => {
      const progressReports: CLIProgressReport[] = [];
      const progressCallback = (report: CLIProgressReport) => {
        progressReports.push(report);
      };

      const options: ProcessExecutionOptions = {
        command: 'echo',
        args: ['test'],
        timeout: 1000
      };

      mockChildProcess.stdout.on.withArgs('data').callsArgWith(1, Buffer.from('Generating workflows...\n'));
      mockChildProcess.on.withArgs('close').callsArgWith(1, 0, null);

      await processExecutor.executeCommand(options, progressCallback);

      const generationReport = progressReports.find(r => r.stage === 'generation');
      assert(generationReport);
      assert.strictEqual(generationReport.progress, 75);
    });

    test('should parse output stage from output', async () => {
      const progressReports: CLIProgressReport[] = [];
      const progressCallback = (report: CLIProgressReport) => {
        progressReports.push(report);
      };

      const options: ProcessExecutionOptions = {
        command: 'echo',
        args: ['test'],
        timeout: 1000
      };

      mockChildProcess.stdout.on.withArgs('data').callsArgWith(1, Buffer.from('Writing files...\n'));
      mockChildProcess.on.withArgs('close').callsArgWith(1, 0, null);

      await processExecutor.executeCommand(options, progressCallback);

      const outputReport = progressReports.find(r => r.stage === 'output');
      assert(outputReport);
      assert.strictEqual(outputReport.progress, 90);
    });
  });

  suite('Environment Handling', () => {
    test('should merge environment variables', async () => {
      const options: ProcessExecutionOptions = {
        command: 'env',
        args: [],
        env: { TEST_VAR: 'test_value' },
        timeout: 1000
      };

      mockChildProcess.on.withArgs('close').callsArgWith(1, 0, null);

      await processExecutor.executeCommand(options);

      const spawnCall = spawnStub.getCall(0);
      const spawnOptions = spawnCall.args[2];
      assert(spawnOptions.env.TEST_VAR === 'test_value');
      assert(spawnOptions.env.PATH); // Should include existing PATH
    });

    test('should use correct working directory', async () => {
      const options: ProcessExecutionOptions = {
        command: 'pwd',
        args: [],
        cwd: '/custom/path',
        timeout: 1000
      };

      mockChildProcess.on.withArgs('close').callsArgWith(1, 0, null);

      await processExecutor.executeCommand(options);

      const spawnCall = spawnStub.getCall(0);
      const spawnOptions = spawnCall.args[2];
      assert.strictEqual(spawnOptions.cwd, '/custom/path');
    });
  });
});