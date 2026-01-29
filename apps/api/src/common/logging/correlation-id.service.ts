import { AsyncLocalStorage } from "async_hooks";
import { Injectable } from "@nestjs/common";

type CorrelationStore = {
  correlationId: string;
};

@Injectable()
export class CorrelationIdService {
  private readonly storage = new AsyncLocalStorage<CorrelationStore>();

  run(correlationId: string, callback: () => void) {
    this.storage.run({ correlationId }, callback);
  }

  getId() {
    return this.storage.getStore()?.correlationId;
  }
}
