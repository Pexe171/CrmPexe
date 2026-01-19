import { AppService } from "./app.service";

describe("AppService", () => {
  it("returns service status", () => {
    const service = new AppService();

    expect(service.getStatus()).toEqual({
      status: "ok",
      service: "crmpexe-api"
    });
  });
});
