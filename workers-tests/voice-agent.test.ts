import {
  evictDurableObject,
  reset,
  runDurableObjectAlarm,
  runInDurableObject,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";

import type { VoiceAssessmentAgent } from "@/features/interviews/server/voice-agent";

const interviewId = "19e12a1c-58eb-4649-a6ba-216898479fd1";

afterEach(async () => {
  await reset();
});

function getStub() {
  return env.VoiceAssessmentAgent.getByName(interviewId);
}

function waitForMessage(webSocket: WebSocket, predicate: (message: unknown) => boolean) {
  return new Promise<unknown>((resolve, reject) => {
    const timeout = setTimeout(() => {
      webSocket.removeEventListener("message", onMessage);
      reject(new Error("Timed out waiting for voice Agent message"));
    }, 2_000);

    const onMessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!predicate(parsed)) return;

      clearTimeout(timeout);
      webSocket.removeEventListener("message", onMessage);
      resolve(parsed);
    };

    webSocket.addEventListener("message", onMessage);
  });
}

async function connect(stub = getStub()) {
  const response = await stub.fetch(
    `https://roundzero.test/agents/voice-assessment-agent/${interviewId}`,
    { headers: { Upgrade: "websocket" } },
  );
  expect(response.status).toBe(101);
  if (!response.webSocket) throw new Error("Voice Agent did not return a WebSocket");
  response.webSocket.accept();
  return response.webSocket;
}

describe("VoiceAssessmentAgent in the Workers runtime", () => {
  it("persists ordered voice history across eviction and serves it after reconnect", async () => {
    const stub = getStub();
    await runInDurableObject(stub, (instance: VoiceAssessmentAgent) => {
      instance.saveMessage("assistant", "Welcome back.");
      instance.saveMessage("user", "Yes.");
      instance.saveMessage("user", "Yes.");
    });

    await evictDurableObject(stub);

    const webSocket = await connect(stub);
    const historyPromise = waitForMessage(
      webSocket,
      (message) =>
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "voice_history",
    );
    webSocket.send(JSON.stringify({ type: "request_voice_history" }));

    await expect(historyPromise).resolves.toEqual({
      type: "voice_history",
      messages: [
        { role: "assistant", content: "Welcome back." },
        { role: "user", content: "Yes." },
        { role: "user", content: "Yes." },
      ],
    });
    webSocket.close(1000, "test complete");
  });

  it("executes the scheduled retention callback and clears SQLite history", async () => {
    const stub = getStub();
    await runInDurableObject(stub, async (instance: VoiceAssessmentAgent, state) => {
      instance.saveMessage("user", "This should expire.");
      await instance.schedule(
        new Date(Date.now() - 1_000),
        "purgeConversationHistory",
        { version: 1 },
        { idempotent: true },
      );

      // Keep Miniflare from automatically consuming the due alarm before the
      // Cloudflare test helper can invoke it deterministically.
      await state.storage.setAlarm(Date.now() + 60_000);
    });

    expect(await runDurableObjectAlarm(stub)).toBe(true);

    await runInDurableObject(stub, (instance: VoiceAssessmentAgent) => {
      expect(instance.getConversationHistory()).toEqual([]);
    });
  });
});
