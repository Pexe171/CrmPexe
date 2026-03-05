import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateEvolutionInstanceDto {
  @IsIn(["QR", "OFFICIAL"])
  type!: "QR" | "OFFICIAL";

  @IsOptional()
  @IsString()
  instanceName?: string;

  /** Obrigatório quando type === "OFFICIAL" (Token de Acesso da Meta) */
  @IsOptional()
  @IsString()
  metaToken?: string;

  /** Obrigatório quando type === "OFFICIAL" (ID do Número de Telefone da Meta) */
  @IsOptional()
  @IsString()
  metaPhoneNumberId?: string;
}
