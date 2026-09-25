import { Readable } from "node:stream";
import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import type { BlobStorage } from "../application/ports.js";

export class AzureBlobStorage implements BlobStorage {
  private constructor(private readonly container: ContainerClient) {}

  static async connect(connectionString: string, containerName: string): Promise<AzureBlobStorage> {
    const container = BlobServiceClient.fromConnectionString(connectionString).getContainerClient(
      containerName,
    );
    await container.createIfNotExists();
    return new AzureBlobStorage(container);
  }

  async put(key: string, content: Uint8Array, contentType: string): Promise<void> {
    await this.container
      .getBlockBlobClient(key)
      .uploadData(content, { blobHTTPHeaders: { blobContentType: contentType } });
  }

  async get(key: string): Promise<ReadableStream<Uint8Array>> {
    const response = await this.container.getBlobClient(key).download();
    if (!response.readableStreamBody) {
      throw new Error(`Blobの本体を取得できませんでした: ${key}`);
    }
    return Readable.toWeb(response.readableStreamBody as Readable) as ReadableStream<Uint8Array>;
  }
}
