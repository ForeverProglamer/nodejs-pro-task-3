import { ApiProperty } from "@nestjs/swagger";

export default class TokenResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ example: "Bearer" })
  tokenType: string;

  @ApiProperty({
    description: "Access token expiration in seconds",
    example: 3600,
  })
  expiresIn: number;
}
