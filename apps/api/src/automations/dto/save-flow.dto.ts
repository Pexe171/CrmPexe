import { IsArray, IsOptional, IsString } from "class-validator";

export class SaveFlowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  nodes!: unknown[];

  @IsArray()
  edges!: unknown[];
}
