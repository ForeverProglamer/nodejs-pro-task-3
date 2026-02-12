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
