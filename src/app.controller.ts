import { Controller, Get } from "@nestjs/common";
import { Public } from "./auth/decorators";
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";

class HealthResponseDto {
  @ApiProperty()
  ok: true;
}

@Controller()
@ApiTags("Health")
export class AppController {
  @Public()
  @Get("health")
  @ApiOperation({ summary: "Health check" })
  @ApiOkResponse({ type: HealthResponseDto })
  health(): HealthResponseDto {
    return { ok: true };
  }
}
