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

  it("/workspaces (GET) should reject unauthenticated requests with expected error contract", async () => {
    const response = await request(app.getHttpServer()).get("/workspaces");

    expect(response.status).toBe(401);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toMatchObject({
      statusCode: 401,
      message: expect.any(String)
    });
  });

  it("/audit-logs (GET) should reject unauthenticated requests with expected error contract", async () => {
    const response = await request(app.getHttpServer()).get("/audit-logs");

    expect(response.status).toBe(401);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toMatchObject({
      statusCode: 401,
      message: expect.any(String)
    });
  });

  it("/companies (GET) should reject unauthenticated requests with expected error contract", async () => {
    const response = await request(app.getHttpServer()).get("/companies");

    expect(response.status).toBe(401);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toMatchObject({
      statusCode: 401,
      message: expect.any(String)
    });
  });
});
