import { IsNotEmpty, IsString } from "class-validator";

export class VerifyWhatsappSmsDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}
