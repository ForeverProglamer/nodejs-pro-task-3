import { UUID } from "crypto";

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  protected constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.details = details;
  }
}

export class FailedToCreateOrderError extends DomainError {
  readonly code = "FAILED_TO_CREATE_ORDER";
  readonly httpStatus = 500;

  constructor() {
    super("Failed to create order", {});
  }
}

export class CannotFindProductsError extends DomainError {
  readonly code = "CANNOT_FIND_PRODUCTS";
  readonly httpStatus = 404;

  constructor(missingProductsCount: number, missingProductIds?: UUID[]) {
    super("Some products can not be found", {
      missingProductsCount,
      missingProductIds,
    });
  }
}

export class NotEnoughItemsInStockError extends DomainError {
  readonly code = "NOT_ENOUGH_ITEMS_IN_STOCK";
  readonly httpStatus = 409;

  constructor(productId: UUID, askedQty: number, stock: number) {
    super("Product does not have enough of stock", {
      productId,
      askedQty,
      stock,
    });
  }
}

export class EntityNotFoundError extends DomainError {
  readonly code = "CANNOT_FIND_ENTITY";
  readonly httpStatus = 404;

  constructor(entityName: string, details?: Record<string, unknown>) {
    super(`Cannot find entity '${entityName}'`, {
      entityName,
      ...details,
    });
  }
}

export class DuplicateEntityCreationError extends DomainError {
  readonly code = "DUPLICATE_ENTITY_CREATION";
  readonly httpStatus = 409;

  constructor(entityName: string, details?: Record<string, unknown>) {
    super(`Such '${entityName}' entity already exists`, {
      entityName,
      ...details,
    });
  }
}

export class IncorrectPasswordError extends DomainError {
  readonly code = "INCORRECT_PASSWORD";
  readonly httpStatus = 401;

  constructor(details?: Record<string, unknown>) {
    super("Incorrect password", details);
  }
}
