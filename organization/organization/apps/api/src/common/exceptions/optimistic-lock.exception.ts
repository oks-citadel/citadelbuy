import { ConflictException } from '@nestjs/common';

/**
 * Exception thrown when an optimistic lock conflict is detected
 * This happens when trying to update a record that has been modified
 * by another transaction since it was read.
 */
export class OptimisticLockException extends ConflictException {
  constructor(
    entityName: string,
    entityId: string,
    expectedVersion?: Date | number,
    actualVersion?: Date | number,
  ) {
    super({
      code: 'OPTIMISTIC_LOCK_CONFLICT',
      message: `The ${entityName} has been modified by another request. Please refresh and try again.`,
      entityName,
      entityId,
      expectedVersion: expectedVersion?.toString(),
      actualVersion: actualVersion?.toString(),
      retryable: true,
    });
  }
}

/**
 * Exception thrown when a stale update is attempted
 * Similar to OptimisticLockException but with simpler messaging
 */
export class StaleUpdateException extends ConflictException {
  constructor(message: string = 'The resource has been modified. Please refresh and retry.') {
    super({
      code: 'STALE_UPDATE',
      message,
      retryable: true,
    });
  }
}

/**
 * Exception for concurrent update conflicts in distributed systems
 */
export class DistributedLockConflictException extends ConflictException {
  constructor(resource: string, operation: string) {
    super({
      code: 'DISTRIBUTED_LOCK_CONFLICT',
      message: `Cannot ${operation} ${resource}: concurrent modification detected`,
      retryable: true,
    });
  }
}
