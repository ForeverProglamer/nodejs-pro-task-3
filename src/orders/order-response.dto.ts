import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UUID } from "crypto";
import { OrderStatus } from "./order.entity";

export class OrderItemResponseDto {
  @ApiProperty({ example: "0e8fd161-5c56-4dba-8c7a-6f422ea4d8ee" })
  productId: UUID;

  @ApiProperty({ example: 1 })
  qty: number;

  @ApiProperty({ example: "15.30" })
  purchasePrice: string;
}

export default class OrderResponseDto {
  @ApiProperty({ example: "aa6e3d83-e019-469e-ba87-227d3e4c789c" })
  id: UUID;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  idempotencyKey: UUID;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  processedAt?: Date;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];
}
