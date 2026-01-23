import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

type EncryptedPayload = {
  iv: string;
  tag: string;
  data: string;
};

@Injectable()
export class IntegrationCryptoService {
  private readonly key: Buffer;

  constructor() {
    this.key = this.loadKey();
  }

  encrypt(payload: Record<string, string>): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const plaintext = JSON.stringify(payload);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    const result: EncryptedPayload = {
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      data: encrypted.toString("base64")
    };

    return JSON.stringify(result);
  }

  decrypt(encryptedPayload: string): Record<string, string> {
    const parsed = JSON.parse(encryptedPayload) as EncryptedPayload;
    const iv = Buffer.from(parsed.iv, "base64");
    const tag = Buffer.from(parsed.tag, "base64");
    const data = Buffer.from(parsed.data, "base64");

    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

    return JSON.parse(decrypted.toString("utf8")) as Record<string, string>;
  }

  private loadKey() {
    const rawKey = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!rawKey) {
      throw new Error("INTEGRATION_ENCRYPTION_KEY não configurada.");
    }

    const base64Key = Buffer.from(rawKey, "base64");
    if (base64Key.length === 32) {
      return base64Key;
    }

    const hexKey = Buffer.from(rawKey, "hex");
    if (hexKey.length === 32) {
      return hexKey;
    }

    throw new Error("INTEGRATION_ENCRYPTION_KEY deve ter 32 bytes em base64 ou hex.");
  }
}
