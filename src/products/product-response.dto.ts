import { ApiProperty } from "@nestjs/swagger";
import { UUID } from "crypto";

export default class ProductResponseDto {
  @ApiProperty({ example: "aa6e3d83-e019-469e-ba87-227d3e4c789c" })
  id: UUID;

  @ApiProperty({ example: "Laptop" })
  title: string;

  @ApiProperty({ example: "Piece of tech" })
  description: string;

  @ApiProperty({ example: 10 })
  stock: number;

  @ApiProperty({ example: "15.30" })
  price: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
