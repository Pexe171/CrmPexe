import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("AppController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/health (GET)", async () => {
    const response = await request(app.getHttpServer()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "crmpexe-api"
    });
  });

  it("/workspaces (GET) should reject unauthenticated requests", async () => {
    const response = await request(app.getHttpServer()).get("/workspaces");

    expect(response.status).toBe(401);
  });

  it("/audit-logs (GET) should reject unauthenticated requests", async () => {
    const response = await request(app.getHttpServer()).get("/audit-logs");

    expect(response.status).toBe(401);
  });

  it("/companies (GET) should reject unauthenticated requests", async () => {
    const response = await request(app.getHttpServer()).get("/companies");

    expect(response.status).toBe(401);
  });

  it("/contacts (GET) should reject unauthenticated requests", async () => {
    const response = await request(app.getHttpServer()).get("/contacts");

    expect(response.status).toBe(401);
  });
});
