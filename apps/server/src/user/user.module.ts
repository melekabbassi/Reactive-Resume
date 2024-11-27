import { forwardRef, Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
//import { StorageModule } from "../storage/storage.module";
import { S3Module } from "../s3/s3.module";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [forwardRef(() => AuthModule.register()), S3Module], // StorageModule is commented out
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
