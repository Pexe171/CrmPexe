import { IsString } from "class-validator";

export class UpdateDealStageDto {
  @IsString()
  stage!: string;
}
