import { Module } from "@nestjs/common";
import { UnitOfWorkProvider } from "./unit-of-work";

@Module({
  exports: [UnitOfWorkProvider],
  providers: [UnitOfWorkProvider],
})
export class CommonModule {}
