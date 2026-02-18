import "dotenv/config";
import { randomUUID } from "crypto";

const USER_ID = process.env.USER_ID;
const PRODUCT_ID = process.env.PRODUCT_ID;

const REQUESTS_COUNT = Number(process.env.REQUESTS_COUNT) ?? 10;

const BASE_URL = "http://localhost:3000";
const BASE_HEADERS = {
  "Content-Type": "application/json",
};

const ORDERS_URL = `${BASE_URL}/orders`;

const body = JSON.stringify({
  userId: USER_ID,
  items: [{ id: PRODUCT_ID, qty: 1 }],
});

async function main() {
  if (!USER_ID || !PRODUCT_ID) {
    console.log("[ERROR] USER_ID and PRODUCT_ID are required env vars!");
    return;
  }
  const responses = await sendRequests();
  const stats = gatherStats(responses);
  console.log("[INFO] Stats:");
  console.table([stats]);
}

main();

async function sendRequests(): Promise<Response[]> {
  const promises: Promise<Response>[] = [];
  for (let i = 0; i < REQUESTS_COUNT; i++) {
    promises.push(
      fetch(ORDERS_URL, {
        method: "POST",
        headers: { ...BASE_HEADERS, "Idempotency-Key": randomUUID() },
        body,
      }),
    );
  }
  return await Promise.all(promises);
}

function gatherStats(responses: Response[]): Record<string, number> {
  let stats = { total: REQUESTS_COUNT };
  responses.forEach((res) => {
    const key = res.statusText.toLowerCase();
    if (!stats[key]) stats[key] = 1;
    else stats[key] += 1;
  });
  return stats;
}
