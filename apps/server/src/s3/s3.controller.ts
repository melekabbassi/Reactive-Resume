import {
  BadRequestException,
  Controller,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';

import { TwoFactorGuard } from '../auth/guards/two-factor.guard';
import { User } from '../user/decorators/user.decorator';

import { S3Service } from './s3.service';
import { Multer } from 'multer';

@ApiTags("S3")
@Controller("s3")
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Put("image")
  @UseGuards(TwoFactorGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @User("id") userId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file.mimetype.startsWith("image")) {
      throw new BadRequestException("The file you uploaded doesn't seem to be an image, upload a file that ends in .jp(e)g or .png.");
    }

    return this.s3Service.uploadObject(userId, "pictures", file.buffer, userId);
  }
}
