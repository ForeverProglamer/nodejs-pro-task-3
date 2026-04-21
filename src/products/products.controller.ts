import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { UUID } from "crypto";
import { Public } from "src/auth/decorators";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from "@nestjs/swagger";
import { ApiErrorResponseDto } from "src/common/api-error-response.dto";
import ProductResponseDto from "./product-response.dto";

@Controller("products")
export class ProductsController {
  constructor(private service: ProductsService) {}

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get product by ID" })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiParam({ name: "id", example: "0e8fd161-5c56-4dba-8c7a-6f422ea4d8ee" })
  async findById(
    @Param("id", ParseUUIDPipe) id: UUID,
  ): Promise<ProductResponseDto> {
    const result = await this.service.findById(id);
    if (!result) throw new NotFoundException("Product not found");
    return result;
  }
}
