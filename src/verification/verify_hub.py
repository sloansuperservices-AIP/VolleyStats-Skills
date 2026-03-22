import sys
import time
from playwright.sync_api import sync_playwright, expect

def verify_hub_navigation():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        try:
            page.goto("http://localhost:3000", timeout=30000)
        except Exception as e:
            print(f"Failed to load page: {e}")
            browser.close()
            return

        # 1. Verify Hub exists
        print("Checking for Hub title...")
        expect(page.get_by_text("Mid TN Volleyball", exact=True).first).to_be_visible()
        page.screenshot(path="src/verification/hub_initial.png")

        # 2. Navigate to DIBS
        print("Navigating to DIBS...")
        page.click("text=DIBS")
        expect(page.get_by_text("Work / Play · Mid TN Volleyball")).to_be_visible()
        page.screenshot(path="src/verification/dibs_view.png")

        # 3. Navigate back to Hub
        print("Returning to Hub...")
        page.click("button[title='Back to Hub']")
        expect(page.get_by_text("Dashboard", exact=True).first).to_be_visible()

        # 4. Navigate to Club Ops (Planner)
        print("Navigating to Club Ops...")
        page.click("text=Club Ops")
        expect(page.get_by_text("Command Center")).to_be_visible()
        page.screenshot(path="src/verification/planner_view.png")

        # 5. Return to Hub
        print("Returning to Hub...")
        page.click("button[title='Back to Hub']")

        # 6. Navigate to PlayerBoard (Combine)
        print("Navigating to PlayerBoard...")
        page.click("text=PlayerBoard")
        # PlayerBoard (CombineApp) requires onboarding if profile not set
        if page.is_visible("text=Athlete Profile"):
            page.fill("input[placeholder='e.g. Jordan Larson']", "Alex Mitchell")
            page.fill("input[placeholder='180']", "175")
            page.click("button:has-text('Initialize Combine')")

        expect(page.get_by_text("Active Stations")).to_be_visible()
        page.screenshot(path="src/verification/combine_view.png")

        print("Verification complete!")
        browser.close()

if __name__ == "__main__":
    verify_hub_navigation()
