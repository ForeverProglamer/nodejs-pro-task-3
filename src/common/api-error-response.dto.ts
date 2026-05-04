import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ApiErrorResponseDto {
  @ApiProperty({ example: "ERROR_CODE" })
  code!: string;

  @ApiProperty({ example: "Operation failed" })
  message!: string;

  @ApiPropertyOptional()
  details?: Record<string, unknown>;

  @ApiProperty({ example: "0e8fd161-5c56-4dba-8c7a-6f422ea4d8ee" })
  correlationId!: string;
}
