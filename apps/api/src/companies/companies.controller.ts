import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuditEntity } from "../audit-logs/audit-log.decorator";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@Controller("companies")
@UseGuards(AccessTokenGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  async listCompanies(@CurrentUser() user: AuthUser) {
    return this.companiesService.listCompanies(user.id);
  }

  @Get(":id")
  async getCompany(@CurrentUser() user: AuthUser, @Param("id") companyId: string) {
    return this.companiesService.getCompany(user.id, companyId);
  }

  @Post()
  @AuditEntity({
    entity: "Company",
    entityId: { source: "response", key: "id" },
    workspaceId: { source: "user" },
    metadata: (request) => ({
      name: request.body?.name,
      domain: request.body?.domain
    })
  })
  async createCompany(@CurrentUser() user: AuthUser, @Body() body: CreateCompanyDto) {
    return this.companiesService.createCompany(user.id, body);
  }

  @Patch(":id")
  @AuditEntity({
    entity: "Company",
    entityId: { source: "param", key: "id" },
    workspaceId: { source: "user" },
    metadata: (request) => ({
      name: request.body?.name,
      domain: request.body?.domain
    })
  })
  async updateCompany(
    @CurrentUser() user: AuthUser,
    @Param("id") companyId: string,
    @Body() body: UpdateCompanyDto
  ) {
    return this.companiesService.updateCompany(user.id, companyId, body);
  }

  @Delete(":id")
  @AuditEntity({
    entity: "Company",
    entityId: { source: "param", key: "id" },
    workspaceId: { source: "user" }
  })
  async deleteCompany(@CurrentUser() user: AuthUser, @Param("id") companyId: string) {
    return this.companiesService.deleteCompany(user.id, companyId);
  }
}
