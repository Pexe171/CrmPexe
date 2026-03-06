import { IsEmail, IsNotEmpty, IsString, Length, Matches } from "class-validator";

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: "O código OTP deve ter exatamente 6 dígitos." })
  @Matches(/^\d{6}$/, { message: "O código OTP deve conter apenas números." })
  code!: string;
}
