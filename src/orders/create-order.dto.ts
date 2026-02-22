import { UUID } from "crypto";

export type OrderItemDtoType = {
  id: UUID;
  qty: number;
};

export class CreateOrderDto {
  userId: UUID; // TODO: Infer from JWT
  items: OrderItemDtoType[];
}
