import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";

//import { StorageModule } from "../storage/storage.module";
import { PrinterService } from "./printer.service";
import { S3Module } from "../s3/s3.module";

@Module({
  imports: [HttpModule, S3Module], // StorageModule is commented out
  providers: [PrinterService],
  exports: [PrinterService],
})
export class PrinterModule {}
