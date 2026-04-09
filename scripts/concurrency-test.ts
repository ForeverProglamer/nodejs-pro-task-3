import "dotenv/config";
import { randomUUID, UUID } from "crypto";

import LogInDto from "src/auth/dtos/log-in.dto";
import { CreateOrderDto } from "src/orders/create-order.dto";
import { USER_EMAIL, USER_PASS } from "src/seed/constants";

const PRODUCT_ID = process.env.PRODUCT_ID;
const REQUESTS_COUNT = Number(process.env.REQUESTS_COUNT || "10");

if (!PRODUCT_ID) {
  console.log("[ERROR] PRODUCT_ID is a required env var!");
  process.exit(1);
}

const BASE_URL = "http://localhost:3000";
const BASE_HEADERS = {
  "Content-Type": "application/json",
};

const LOGIN_URL = `${BASE_URL}/auth/login`;
const ORDERS_URL = `${BASE_URL}/orders`;

const loginDto: LogInDto = {
  email: USER_EMAIL,
  password: USER_PASS,
};

const createOrderDto: CreateOrderDto = {
  items: [{ id: PRODUCT_ID as UUID, qty: 1 }],
};

async function main() {
  console.log("[INFO] Logging in...");
  const accessToken = await login();
  console.log(`[INFO] Sending ${REQUESTS_COUNT} concurrent requests...`);
  const responses = await sendRequests(accessToken);
  const stats = gatherStats(responses);
  console.log("[INFO] Stats:");
  console.table([stats]);
}

main();

async function login(): Promise<string> {
  const response = await fetch(LOGIN_URL, {
    method: "POST",
    headers: BASE_HEADERS,
    body: JSON.stringify(loginDto),
  });
  const data = await response.json();
  return data.accessToken;
}

async function sendRequests(accessToken: string): Promise<Response[]> {
  const promises: Promise<Response>[] = [];
  for (let i = 0; i < REQUESTS_COUNT; i++) {
    promises.push(
      fetch(ORDERS_URL, {
        method: "POST",
        headers: {
          ...BASE_HEADERS,
          "Idempotency-Key": randomUUID(),
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(createOrderDto),
      }),
    );
  }
  return await Promise.all(promises);
}

function gatherStats(responses: Response[]): Record<string, number> {
  const stats = { total: REQUESTS_COUNT };
  responses.forEach((res) => {
    const key = res.statusText.toLowerCase();
    if (!stats[key]) stats[key] = 1;
    else stats[key] += 1;
  });
  return stats;
}
