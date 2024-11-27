import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { PrinterModule } from "../printer/printer.module";
//import { StorageModule } from "../storage/storage.module";
import { S3Module } from "../s3/s3.module";
import { BrowserHealthIndicator } from "./browser.health";
import { DatabaseHealthIndicator } from "./database.health";
import { HealthController } from "./health.controller";
//import { StorageHealthIndicator } from "./storage.health";
import { S3HealthIndicator } from "./s3.health";

@Module({
  imports: [TerminusModule, PrinterModule, S3Module], // StorageModule is commented out
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator, BrowserHealthIndicator, S3HealthIndicator], // StorageHealthIndicator is commented out
})
export class HealthModule {}
