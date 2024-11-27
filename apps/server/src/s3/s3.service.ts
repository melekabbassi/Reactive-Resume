import {
  DeleteObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createId } from "@paralleldrive/cuid2";
import sharp from "sharp";

type ImageUploadType = "pictures" | "previews";
type DocumentUploadType = "resumes";
export type UploadType = ImageUploadType | DocumentUploadType;

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private s3: S3Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {}

  async bucketExists() {
    try {
      const headBucketCommand = new HeadBucketCommand({ Bucket: this.bucketName });
      await this.s3.send(headBucketCommand);

      return true;
    } catch (error) {
      this.logger.error(
        "The storage bucket does not exist. Make sure to create the bucket before starting the application.",
      );
      return false;
    }
  }

  async onModuleInit() {
    const region = this.configService.getOrThrow<string>("AWS_REGION");
    const accessKeyId = this.configService.getOrThrow<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.configService.getOrThrow<string>("AWS_ACCESS_SECRET");

    // Initialize the S3 client
    this.s3 = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.bucketName = this.configService.getOrThrow<string>("AWS_BUCKET");
    const skipBucketCheck = this.configService.getOrThrow<boolean>("STORAGE_SKIP_BUCKET_CHECK");
    if (skipBucketCheck) {
      this.logger.warn("Skipping the verification of whether the storage bucket exists.");
      this.logger.warn(
        "Make sure that the following paths are publicly accessible: `/{pictures,previews,resumes}/*`",
      );

      return;
    }

    // Check if the bucket exists
    try {
      const headBucketCommand = new HeadBucketCommand({ Bucket: this.bucketName });
      await this.s3.send(headBucketCommand);

      this.logger.log("Successfully connected to the storage service.");
    } catch (error) {
      this.logger.error("Error connecting to the storage service.", error);
      throw new InternalServerErrorException(
        "There was an error while connecting to the storage service.",
      );
    }
    this.logger.log("Successfully initialized AWS S3 client.");
  }

  async uploadObject(
    userId: string,
    type: UploadType,
    buffer: Buffer,
    filename: string = createId(),
  ) {
    const extension = type === "resumes" ? "pdf" : "jpg";
    const filepath = `${userId}/${type}/${filename}.${extension}`;
    const metadata: Record<string, string> =
      extension === "jpg"
        ? { "Content-Type": "image/jpeg" }
        : {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=${filename}.${extension}`,
          };

    try {
      if (extension === "jpg") {
        // Resize the image using sharp
        buffer = await sharp(buffer)
          .resize({ width: 600, height: 600, fit: sharp.fit.outside })
          .jpeg({ quality: 80 })
          .toBuffer();
      }

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filepath,
        Body: buffer,
        ContentType: metadata["Content-Type"],
        Metadata: metadata,
      });

      await this.s3.send(command);

      const region = this.configService.getOrThrow<string>("AWS_REGION");
      return `https://${this.bucketName}.s3.${region}.amazonaws.com/${filepath}`;
    } catch (error) {
      this.logger.error("Error uploading file to S3", error);
      throw new InternalServerErrorException("There was an error while uploading the file.");
    }
  }

  async deleteObject(userId: string, type: UploadType, filename: string) {
    const extension = type === "resumes" ? "pdf" : "jpg";
    const path = `${userId}/${type}/${filename}.${extension}`;

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      await this.s3.send(command);
    } catch (error) {
      this.logger.error(`Error deleting file: ${path}`, error);
      throw new InternalServerErrorException(
        `There was an error while deleting the file: ${path}.`,
      );
    }
  }

  async deleteFolder(prefix: string) {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const { Contents } = await this.s3.send(listCommand);

      if (!Contents || Contents.length === 0) {
        return;
      }

      const keys = Contents.map((item) => ({ Key: item.Key }));

      for (const key of keys) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key.Key ?? "",
        });

        await this.s3.send(deleteCommand);
      }
    } catch (error) {
      this.logger.error(`Error deleting folder: ${prefix}`, error);
      throw new InternalServerErrorException(
        `There was an error while deleting the folder: ${prefix}.`,
      );
    }
  }
}
