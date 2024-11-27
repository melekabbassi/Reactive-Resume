import { Injectable } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";

import { S3Service } from "../s3/s3.service";


@Injectable()
export class S3HealthIndicator extends HealthIndicator {
  constructor(private readonly s3Service: S3Service) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      await this.s3Service.bucketExists();

      return this.getStatus("s3", true);
    } catch (error: unknown) {
      return this.getStatus("s3", false, { message: (error as Error).message });
    }
  }
}
