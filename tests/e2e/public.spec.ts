import { expect, test } from "@playwright/test";

test("landing page offers Google sign in without fabricated learning data", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Think Deeper. Learn Smarter." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Installation setup" }).click();
  await expect(page.getByRole("heading", { name: "Connect your services" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("student and teacher routes require a real authenticated account", async ({ page }) => {
  for (const url of ["/dashboard", "/courses", "/progress", "/revision", "/connections", "/teacher", "/teacher/classes", "/register"]) {
    await page.goto(url);
    await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/");
  }
});

test("mutation endpoints reject cross-origin requests", async ({ request }) => {
  const response = await request.post("/api/enroll", { headers: { Origin: "https://untrusted.example" }, data: { course_id: "10000000-0000-4000-8000-000000000001", mode: "scratch" } });
  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ error: "Request origin is not allowed." });
});

test("OAuth callback handles cancelled and missing codes without a redirect loop", async ({ request }) => {
  const cancelled = await request.get("/auth/callback?error=access_denied", { maxRedirects: 0 });
  expect(cancelled.status()).toBe(307);
  const cancelledLocation = new URL(cancelled.headers().location);
  expect(cancelledLocation.pathname).toBe("/");
  expect(cancelledLocation.searchParams.get("error")).toBe("denied");

  const missing = await request.get("/auth/callback", { maxRedirects: 0 });
  expect(missing.status()).toBe(307);
  expect(new URL(missing.headers().location).pathname).toBe("/");
});

test("privacy page explains reciprocal student and teacher acceptance", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Your learning data" })).toBeVisible();
  await expect(page.getByText("A Student ID alone does not reveal learning records.", { exact: false })).toBeVisible();
  await expect(page.getByText("The recipient must accept before access is granted; they can also reject.", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
