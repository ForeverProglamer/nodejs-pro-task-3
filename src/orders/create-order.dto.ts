import { UUID } from "crypto";
import { IsUUID, IsInt, ValidateNested, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class OrderItemDto {
  @ApiProperty({ example: "0e8fd161-5c56-4dba-8c7a-6f422ea4d8ee" })
  @IsUUID()
  id: UUID;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @ValidateNested()
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
