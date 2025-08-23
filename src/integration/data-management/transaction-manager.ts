/**
 * Transaction manager with ACID compliance and distributed transaction support
 */

import { 
  TransactionManager, 
  Transaction, 
  TransactionInfo 
} from './interfaces';
import { TransactionIsolationLevel } from './types';

export class TransactionManagerImpl implements TransactionManager {
  private transactions: Map<string, TransactionState> = new Map();
  private savepoints: Map<string, Map<string, SavepointState>> = new Map();
  private distributedTransactions: Map<string, DistributedTransactionState> = new Map();

  async begin(isolation?: TransactionIsolationLevel): Promise<Transaction> {
    const transactionId = this.generateTransactionId();
    const startTime = new Date();
    
    const transaction: Transaction = {
      id: transactionId,
      isolation: isolation || 'READ_COMMITTED',
      startTime,
      savepoints: [],
      status: 'active'
    };

    const transactionState: TransactionState = {
      transaction,
      operations: [],
      locks: new Set(),
      participants: new Set(),
      coordinator: null
    };

    this.transactions.set(transactionId, transactionState);
    this.savepoints.set(transactionId, new Map());

    return transaction;
  }

  async commit(transaction: Transaction): Promise<void> {
    const transactionState = this.transactions.get(transaction.id);
    if (!transactionState) {
      throw new Error(`Transaction not found: ${transaction.id}`);
    }

    if (transaction.status !== 'active') {
      throw new Error(`Cannot commit transaction in ${transaction.status} state`);
    }

    try {
      // Check if this is a distributed transaction
      if (transactionState.participants.size > 1) {
        await this.commitDistributedTransaction(transaction, transactionState);
      } else {
        await this.commitLocalTransaction(transaction, transactionState);
      }

      transaction.status = 'committed';
    } catch (error) {
      transaction.status = 'rolled_back';
      await this.rollbackTransaction(transaction, transactionState);
      throw error;
    } finally {
      this.cleanupTransaction(transaction.id);
    }
  }

  async rollback(transaction: Transaction): Promise<void> {
    const transactionState = this.transactions.get(transaction.id);
    if (!transactionState) {
      throw new Error(`Transaction not found: ${transaction.id}`);
    }

    if (transaction.status !== 'active') {
      throw new Error(`Cannot rollback transaction in ${transaction.status} state`);
    }

    try {
      await this.rollbackTransaction(transaction, transactionState);
      transaction.status = 'rolled_back';
    } finally {
      this.cleanupTransaction(transaction.id);
    }
  }

  async savepoint(transaction: Transaction, name: string): Promise<void> {
    const transactionState = this.transactions.get(transaction.id);
    if (!transactionState) {
      throw new Error(`Transaction not found: ${transaction.id}`);
    }

    if (transaction.status !== 'active') {
      throw new Error(`Cannot create savepoint in ${transaction.status} transaction`);
    }

    const savepoint: SavepointState = {
      name,
      timestamp: new Date(),
      operationIndex: transactionState.operations.length,
      locks: new Set(transactionState.locks)
    };

    const transactionSavepoints = this.savepoints.get(transaction.id)!;
    transactionSavepoints.set(name, savepoint);
    
    transaction.savepoints.push(name);
  }

  async rollbackToSavepoint(transaction: Transaction, name: string): Promise<void> {
    const transactionState = this.transactions.get(transaction.id);
    if (!transactionState) {
      throw new Error(`Transaction not found: ${transaction.id}`);
    }

    const transactionSavepoints = this.savepoints.get(transaction.id)!;
    const savepoint = transactionSavepoints.get(name);
    if (!savepoint) {
      throw new Error(`Savepoint not found: ${name}`);
    }

    if (transaction.status !== 'active') {
      throw new Error(`Cannot rollback to savepoint in ${transaction.status} transaction`);
    }

    try {
      // Rollback operations after the savepoint
      const operationsToRollback = transactionState.operations.slice(savepoint.operationIndex);
      await this.rollbackOperations(operationsToRollback.reverse());

      // Restore locks to savepoint state
      transactionState.locks = new Set(savepoint.locks);

      // Remove operations after savepoint
      transactionState.operations = transactionState.operations.slice(0, savepoint.operationIndex);

      // Remove savepoints created after this one
      const savepointIndex = transaction.savepoints.indexOf(name);
      const savepointsToRemove = transaction.savepoints.slice(savepointIndex + 1);
      
      for (const spName of savepointsToRemove) {
        transactionSavepoints.delete(spName);
      }
      
      transaction.savepoints = transaction.savepoints.slice(0, savepointIndex + 1);

    } catch (error) {
      throw new Error(`Failed to rollback to savepoint ${name}: ${error.message}`);
    }
  }

  async getActiveTransactions(): Promise<TransactionInfo[]> {
    const activeTransactions: TransactionInfo[] = [];

    for (const [id, state] of this.transactions) {
      if (state.transaction.status === 'active') {
        activeTransactions.push({
          id,
          startTime: state.transaction.startTime,
          isolation: state.transaction.isolation,
          queries: state.operations.length,
          status: state.transaction.status
        });
      }
    }

    return activeTransactions;
  }

  // Distributed transaction support
  async beginDistributedTransaction(participants: string[], isolation?: TransactionIsolationLevel): Promise<Transaction> {
    const transaction = await this.begin(isolation);
    const transactionState = this.transactions.get(transaction.id)!;
    
    // Mark as distributed transaction
    for (const participant of participants) {
      transactionState.participants.add(participant);
    }
    
    // Set this node as coordinator
    transactionState.coordinator = 'local';
    
    const distributedState: DistributedTransactionState = {
      transactionId: transaction.id,
      coordinator: 'local',
      participants: new Map(),
      phase: 'active',
      votes: new Map()
    };

    // Initialize participant states
    for (const participant of participants) {
      distributedState.participants.set(participant, {
        id: participant,
        status: 'active',
        prepared: false,
        committed: false
      });
    }

    this.distributedTransactions.set(transaction.id, distributedState);
    
    return transaction;
  }

  private async commitDistributedTransaction(transaction: Transaction, transactionState: TransactionState): Promise<void> {
    const distributedState = this.distributedTransactions.get(transaction.id);
    if (!distributedState) {
      throw new Error(`Distributed transaction state not found: ${transaction.id}`);
    }

    // Two-Phase Commit Protocol
    try {
      // Phase 1: Prepare
      distributedState.phase = 'preparing';
      const prepareResults = await this.preparePhase(distributedState);
      
      // Check if all participants voted to commit
      const allPrepared = Array.from(prepareResults.values()).every(result => result);
      
      if (allPrepared) {
        // Phase 2: Commit
        distributedState.phase = 'committing';
        await this.commitPhase(distributedState);
        distributedState.phase = 'committed';
      } else {
        // Phase 2: Abort
        distributedState.phase = 'aborting';
        await this.abortPhase(distributedState);
        distributedState.phase = 'aborted';
        throw new Error('Distributed transaction aborted - not all participants prepared');
      }
    } catch (error) {
      distributedState.phase = 'aborted';
      await this.abortPhase(distributedState);
      throw error;
    }
  }

  private async preparePhase(distributedState: DistributedTransactionState): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const [participantId, participant] of distributedState.participants) {
      try {
        // Send prepare message to participant
        const prepared = await this.sendPrepareMessage(participantId, distributedState.transactionId);
        results.set(participantId, prepared);
        participant.prepared = prepared;
      } catch (error) {
        results.set(participantId, false);
        participant.prepared = false;
      }
    }
    
    return results;
  }

  private async commitPhase(distributedState: DistributedTransactionState): Promise<void> {
    const commitPromises: Promise<void>[] = [];
    
    for (const [participantId, participant] of distributedState.participants) {
      if (participant.prepared) {
        commitPromises.push(
          this.sendCommitMessage(participantId, distributedState.transactionId)
            .then(() => {
              participant.committed = true;
            })
        );
      }
    }
    
    await Promise.all(commitPromises);
  }

  private async abortPhase(distributedState: DistributedTransactionState): Promise<void> {
    const abortPromises: Promise<void>[] = [];
    
    for (const [participantId] of distributedState.participants) {
      abortPromises.push(
        this.sendAbortMessage(participantId, distributedState.transactionId)
      );
    }
    
    await Promise.allSettled(abortPromises); // Continue even if some fail
  }

  private async commitLocalTransaction(transaction: Transaction, transactionState: TransactionState): Promise<void> {
    // Apply all operations atomically
    try {
      await this.applyOperations(transactionState.operations);
      await this.releaseLocks(transactionState.locks);
    } catch (error) {
      throw new Error(`Failed to commit local transaction: ${error.message}`);
    }
  }

  private async rollbackTransaction(transaction: Transaction, transactionState: TransactionState): Promise<void> {
    try {
      // Rollback all operations in reverse order
      const operationsToRollback = [...transactionState.operations].reverse();
      await this.rollbackOperations(operationsToRollback);
      await this.releaseLocks(transactionState.locks);
    } catch (error) {
      console.error(`Error during rollback of transaction ${transaction.id}:`, error);
    }
  }

  private async applyOperations(operations: TransactionOperation[]): Promise<void> {
    for (const operation of operations) {
      await this.applyOperation(operation);
    }
  }

  private async rollbackOperations(operations: TransactionOperation[]): Promise<void> {
    for (const operation of operations) {
      await this.rollbackOperation(operation);
    }
  }

  private async applyOperation(operation: TransactionOperation): Promise<void> {
    // This would apply the operation to the actual database
    console.log(`Applying operation: ${operation.type} on ${operation.resource}`);
  }

  private async rollbackOperation(operation: TransactionOperation): Promise<void> {
    // This would rollback the operation from the actual database
    console.log(`Rolling back operation: ${operation.type} on ${operation.resource}`);
  }

  private async releaseLocks(locks: Set<string>): Promise<void> {
    // This would release all locks held by the transaction
    console.log(`Releasing ${locks.size} locks`);
  }

  private async sendPrepareMessage(participantId: string, transactionId: string): Promise<boolean> {
    // This would send a prepare message to the participant
    console.log(`Sending prepare message to ${participantId} for transaction ${transactionId}`);
    return true; // Mock response
  }

  private async sendCommitMessage(participantId: string, transactionId: string): Promise<void> {
    // This would send a commit message to the participant
    console.log(`Sending commit message to ${participantId} for transaction ${transactionId}`);
  }

  private async sendAbortMessage(participantId: string, transactionId: string): Promise<void> {
    // This would send an abort message to the participant
    console.log(`Sending abort message to ${participantId} for transaction ${transactionId}`);
  }

  private cleanupTransaction(transactionId: string): void {
    this.transactions.delete(transactionId);
    this.savepoints.delete(transactionId);
    this.distributedTransactions.delete(transactionId);
  }

  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `tx_${timestamp}_${random}`;
  }
}

// Supporting interfaces and types
interface TransactionState {
  transaction: Transaction;
  operations: TransactionOperation[];
  locks: Set<string>;
  participants: Set<string>;
  coordinator: string | null;
}

interface SavepointState {
  name: string;
  timestamp: Date;
  operationIndex: number;
  locks: Set<string>;
}

interface TransactionOperation {
  type: 'insert' | 'update' | 'delete' | 'select';
  resource: string;
  data: any;
  timestamp: Date;
  rollbackData?: any;
}

interface DistributedTransactionState {
  transactionId: string;
  coordinator: string;
  participants: Map<string, ParticipantState>;
  phase: 'active' | 'preparing' | 'committing' | 'aborting' | 'committed' | 'aborted';
  votes: Map<string, boolean>;
}

interface ParticipantState {
  id: string;
  status: 'active' | 'prepared' | 'committed' | 'aborted';
  prepared: boolean;
  committed: boolean;
}