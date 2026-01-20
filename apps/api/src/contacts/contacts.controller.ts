import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuditEntity } from "../audit-logs/audit-log.decorator";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { ContactsService } from "./contacts.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";

@Controller("contacts")
@UseGuards(AccessTokenGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  async listContacts(@CurrentUser() user: AuthUser) {
    return this.contactsService.listContacts(user.id);
  }

  @Get(":id")
  async getContact(@CurrentUser() user: AuthUser, @Param("id") contactId: string) {
    return this.contactsService.getContact(user.id, contactId);
  }

  @Post()
  @AuditEntity({
    entity: "Contact",
    entityId: { source: "response", key: "id" },
    workspaceId: { source: "user" },
    metadata: (request) => ({
      name: request.body?.name,
      email: request.body?.email,
      companyId: request.body?.companyId
    })
  })
  async createContact(@CurrentUser() user: AuthUser, @Body() body: CreateContactDto) {
    return this.contactsService.createContact(user.id, body);
  }

  @Patch(":id")
  @AuditEntity({
    entity: "Contact",
    entityId: { source: "param", key: "id" },
    workspaceId: { source: "user" },
    metadata: (request) => ({
      name: request.body?.name,
      email: request.body?.email,
      companyId: request.body?.companyId
    })
  })
  async updateContact(
    @CurrentUser() user: AuthUser,
    @Param("id") contactId: string,
    @Body() body: UpdateContactDto
  ) {
    return this.contactsService.updateContact(user.id, contactId, body);
  }

  @Delete(":id")
  @AuditEntity({
    entity: "Contact",
    entityId: { source: "param", key: "id" },
    workspaceId: { source: "user" }
  })
  async deleteContact(@CurrentUser() user: AuthUser, @Param("id") contactId: string) {
    return this.contactsService.deleteContact(user.id, contactId);
  }
}
