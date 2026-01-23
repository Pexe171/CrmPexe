import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class RequestOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsEmail()
  @IsOptional()
  emailConfirmation?: string;
}
