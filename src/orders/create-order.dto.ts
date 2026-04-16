import { UUID } from "crypto";
import { IsUUID, IsInt, ValidateNested, Min } from "class-validator";
import { Type } from "class-transformer";

export class OrderItemDto {
  @IsUUID()
  id: UUID;

  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
