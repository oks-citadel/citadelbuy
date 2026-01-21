/**
 * Product Search Events
 * Events emitted when products are created, updated, or deleted
 * Used to keep search index in sync with database
 */

export class ProductIndexEvent {
  constructor(public readonly productId: string) {}
}

export class ProductCreatedEvent extends ProductIndexEvent {}

export class ProductUpdatedEvent extends ProductIndexEvent {}

export class ProductDeletedEvent extends ProductIndexEvent {}

export class BulkProductIndexEvent {
  constructor(public readonly productIds?: string[]) {}
}
