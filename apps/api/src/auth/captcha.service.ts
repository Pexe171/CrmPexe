import { BadRequestException, Injectable } from "@nestjs/common";

@Injectable()
export class CaptchaService {
  private readonly required = process.env.CAPTCHA_REQUIRED === "true";
  private readonly secret = process.env.CAPTCHA_SECRET;

  ensureValid(token?: string) {
    if (!this.secret && !this.required) {
      return;
    }

    const trimmedToken = token?.trim();
    if (!trimmedToken) {
      throw new BadRequestException("Captcha obrigatório.");
    }

    if (this.secret && trimmedToken !== this.secret) {
      throw new BadRequestException("Captcha inválido.");
    }
  }
}
