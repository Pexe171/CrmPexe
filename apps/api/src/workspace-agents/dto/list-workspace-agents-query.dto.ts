import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class ListWorkspaceAgentsQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) {
      return undefined;
    }

    return value === "true" || value === true;
  })
  @IsBoolean()
  isActive?: boolean;
}
