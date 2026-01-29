import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  captchaToken?: string;
}
