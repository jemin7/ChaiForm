"""E2E check: signup -> AI form generation -> save -> publish -> public submit -> AI summary.

Creates a throwaway account, generates a form with AI, saves + publishes it,
submits a response through the public link, then runs the AI response-summary
insight. Exercises every AI feature end to end and reports which toast/state
appears.
"""
import random
import sys
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
STAMP = str(int(time.time())) + str(random.randint(100, 999))
EMAIL = f"chai.e2e.{STAMP}@example.com"
PASSWORD = "TeaTime!2026"

console_errors = []


def answer_all_fields(public_page) -> int:
    """Answer every question on the public form, whatever types AI generated."""
    answered = 0
    cards = public_page.locator("main [id^='field-']")
    for i in range(cards.count()):
        card = cards.nth(i)
        stars = card.get_by_role("button", name="5 stars")
        if stars.count():
            stars.first.click()
            answered += 1
            continue
        select = card.locator("select")
        if select.count():
            select.first.select_option(index=1)
            answered += 1
            continue
        checkboxes = card.get_by_role("checkbox")
        if checkboxes.count():
            checkboxes.first.click()
            answered += 1
            continue
        area = card.locator("textarea:visible")
        if area.count():
            area.first.fill("The aroma is wonderful, maybe add a decaf option next time")
            answered += 1
            continue
        visible_input = card.locator("input:visible")
        if visible_input.count():
            first_input = visible_input.first
            if first_input.get_attribute("type") == "email":
                first_input.fill("taster@example.com")
            elif first_input.get_attribute("type") == "number":
                first_input.fill("7")
            else:
                first_input.fill("Great aroma, well balanced")
            answered += 1
    return answered


def main() -> int:
    ok = False
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on(
            "console",
            lambda msg: console_errors.append(msg.text) if msg.type == "error" else None,
        )

        # --- Signup -----------------------------------------------------
        page.goto(f"{BASE}/signup", wait_until="networkidle")
        page.get_by_label("Name").fill("Chai E2E")
        page.get_by_label("Email").fill(EMAIL)
        page.get_by_label("Password", exact=True).fill(PASSWORD)
        page.get_by_role("button", name="Create account").click()
        page.wait_for_url("**/dashboard", timeout=30_000)
        print(f"[ok] signed up as {EMAIL}")

        # --- Open the AI builder ----------------------------------------
        page.goto(f"{BASE}/dashboard/forms/create", wait_until="networkidle")
        page.wait_for_selector("text=Generate with AI", timeout=30_000)

        # The credits line only renders once the `me` query resolves; give it
        # time instead of assuming it is already in the DOM.
        page.wait_for_selector("text=/AI credits left today|Unlimited AI generations/", timeout=30_000)
        credits_line = page.locator("text=/AI credits left today/").first
        if credits_line.count():
            print(f"[credits] {credits_line.inner_text()}")

        prompt = (
            "A customer feedback form for our new coffee blend, "
            "with a rating and a question about what to improve next"
        )
        page.get_by_placeholder("e.g. A customer feedback form").fill(prompt)

        page.get_by_role("button", name="Generate draft").click()
        print("[..] Generate draft clicked, waiting for result...")

        # Wait for either the success or error toast (up to 120s for AI latency
        # + model fallback retries).
        outcome = page.wait_for_selector(
            "text=/AI draft ready|temporarily unavailable|rate-limiting|busy right now|Unable to generate|out of AI credits/",
            timeout=120_000,
        )
        print(f"[result] {outcome.inner_text()}")

        if "AI draft ready" not in outcome.inner_text():
            page.screenshot(path="scripts/ai-e2e-result.png", full_page=True)
            print("[fail] AI generation did not succeed; screenshot saved")
            browser.close()
            return 1

        time.sleep(1.0)
        title_value = page.locator("#title").input_value()
        print(f"[fields] generated title={title_value!r}")

        # Make the form publicly fillable (private published forms are only
        # visible to their owner by design).
        page.locator("#visibility").select_option("public")

        # --- Save the draft ----------------------------------------------
        page.get_by_role("button", name="Save draft").click()
        page.wait_for_url("**/dashboard/forms/*", timeout=30_000)
        page.wait_for_selector("text=Draft saved", timeout=20_000)
        print("[ok] draft saved")

        # --- Publish ------------------------------------------------------
        page.get_by_role("button", name="Publish", exact=True).first.click()
        page.wait_for_selector("text=Form published", timeout=20_000)
        print("[ok] form published")

        # Grab the public share link from the share dialog.
        page.wait_for_selector("[aria-label='Form share link']", timeout=20_000)
        public_url = page.get_by_label("Form share link").input_value()
        print(f"[ok] share link: {public_url}")
        page.keyboard.press("Escape")

        # --- Submit a response through the public form --------------------
        public_page = browser.new_page(viewport={"width": 1440, "height": 900})
        # Next dev compiles this route on first visit — allow a long timeout.
        public_page.goto(public_url, wait_until="domcontentloaded", timeout=60_000)
        # The form renders client-side after the tRPC query; wait for the
        # submit button (or the unavailable state) rather than guessing timing.
        public_page.wait_for_selector("css=main", timeout=60_000)
        deadline = time.time() + 60
        while time.time() < deadline:
            if public_page.locator("text=This form isn't available").count():
                print("[fail] public form not available")
                page.screenshot(path="scripts/ai-e2e-result.png", full_page=True)
                browser.close()
                return 1
            if public_page.get_by_role("button", name="Submit", exact=True).count():
                break
            time.sleep(1)

        answered = answer_all_fields(public_page)
        print(f"[ok] answered {answered} question(s)")

        public_page.get_by_role("button", name="Submit", exact=True).click()
        public_page.wait_for_selector("text=Response recorded", timeout=30_000)
        print("[ok] public response submitted")
        public_page.close()

        # --- AI response summary ------------------------------------------
        analytics_url = f"{page.url.rstrip('/')}/analytics"
        page.goto(analytics_url, wait_until="domcontentloaded", timeout=60_000)
        # The Generate summary button only renders once responses exist, so
        # waiting for it doubles as a response-count assertion.
        page.wait_for_selector("button:has-text('Generate summary')", timeout=60_000)
        print("[ok] analytics shows at least one response")

        page.get_by_role("button", name="Generate summary").click()
        print("[..] Generate summary clicked, waiting for AI insight...")

        summary = page.wait_for_selector(
            "text=/Suggested next step|temporarily unavailable|rate-limiting|busy right now/",
            timeout=120_000,
        )
        summary_text = summary.inner_text()
        print(f"[summary] {summary_text[:220]}")

        ok = "Suggested next step" in summary_text
        page.screenshot(path="scripts/ai-e2e-result.png", full_page=True)
        print("[screenshot] scripts/ai-e2e-result.png")

        browser.close()

    if console_errors:
        print(f"[console errors] ({len(console_errors)})")
        for err in console_errors[:10]:
            print("  -", err[:200])
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
