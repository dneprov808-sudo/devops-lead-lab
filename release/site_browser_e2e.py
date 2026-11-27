"""Real Chromium acceptance for a built static Academy release (local loopback only)."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import threading
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    directory = ROOT / "site-dist" / sha
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["commit"] == sha
    course = json.loads((ROOT / "learning/course.json").read_text(encoding="utf-8"))
    linux = next(t for m in course["modules"] for t in m["topics"] if t["id"] == "linux")
    n = manifest["counts"]["chapters"]
    errors = []
    with ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(directory))) as server:
        origin = f"http://127.0.0.1:{server.server_port}"
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch()
                try:
                    context = browser.new_context(viewport={"width": 1280, "height": 900})
                    page = context.new_page()
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    # A static course should not send any network request outside its local origin.
                    external = []
                    def route_request(route):
                        if route.request.url.startswith(origin + "/"):
                            route.continue_()
                        else:
                            external.append(route.request.url)
                            route.abort()
                    context.route("**/*", route_request)
                    page.goto(origin + "/", wait_until="domcontentloaded")
                    expect(page.locator("#course-count")).to_have_text(f"0 / {n}")
                    expect(page.locator("#course-content h2")).to_contain_text("Linux")
                    expect(page.locator(".site-navigation a[aria-current=page]")).to_have_text("Курс")
                    expect(page.locator(".course-stagebar button")).to_have_count(4)
                    expect(page.locator(".course-stagebar [aria-current=step]")).to_have_text("Введение")
                    page.locator("#course-search").fill("DOCKER")
                    expect(page.locator("#course-search-results button").first).to_be_visible()
                    page.locator("#course-search-results button").first.click()
                    expect(page.locator("#course-current-title")).to_contain_text("Docker")
                    expect(page.locator("#course-search")).to_have_value("")
                    page.locator("#course-search").fill("Linux")
                    page.locator("#course-search-results button").first.click()
                    expect(page.locator("#course-content h2")).to_contain_text("Linux")
                    page.locator("#course-nav").get_by_role("button", name="Следующий шаг →", exact=True).click()
                    chapter = page.locator("#course-content h2").inner_text()
                    for _ in range(2):
                        page.locator("#course-content").get_by_role("button", name="Следующая часть →", exact=True).click()
                    page.get_by_role("button", name="Отметить ознакомление и продолжить →", exact=True).click()
                    expect(page.locator("#course-count")).to_have_text(f"1 / {n}")
                    next_chapter = page.locator("#course-content h2").inner_text()
                    assert next_chapter != chapter
                    page.reload(wait_until="domcontentloaded")
                    expect(page.locator("#course-content h2")).to_have_text(next_chapter)
                    expect(page.locator("#course-count")).to_have_text(f"1 / {n}")
                    page.locator("#course-weeks").get_by_role("button", name="Самопроверка", exact=True).click()
                    next_button = page.get_by_role("button", name="К практике →", exact=True)
                    expect(next_button).to_be_disabled()
                    scenario = linux["scenario"]
                    wrong = next(i for i in range(len(scenario["choices"])) if i != scenario["correct"])
                    page.get_by_role("button", name=scenario["choices"][wrong], exact=True).click()
                    expect(next_button).to_be_disabled()
                    page.get_by_role("button", name=scenario["choices"][scenario["correct"]], exact=True).click()
                    expect(next_button).to_be_enabled()
                    next_button.click()
                    expect(page.locator("#course-content")).to_contain_text("Основная лаборатория")
                    page.locator(".site-navigation").get_by_role("link", name="Библиотека и стенды", exact=True).click()
                    expect(page).to_have_url(origin + "/library.html")
                    page.locator(".site-navigation").get_by_role("link", name="Собеседования", exact=True).click()
                    expect(page).to_have_url(origin + "/interview.html")
                    expect(page.locator("#main textarea")).to_be_visible()
                    page.locator(".site-navigation").get_by_role("link", name="Архитектура", exact=True).click()
                    expect(page.locator("#counts")).to_be_visible()
                    page.locator(".site-navigation").get_by_role("link", name="Курс", exact=True).click()
                    expect(page.locator("#course-count")).to_have_text(f"1 / {n}")
                    page.locator("#site-theme").click()
                    expect(page.locator("html")).to_have_attribute("data-theme", "light")
                    page.reload(wait_until="domcontentloaded")
                    expect(page.locator("html")).to_have_attribute("data-theme", "light")
                    page.set_viewport_size({"width": 390, "height": 844})
                    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "Horizontal overflow on mobile"
                    assert not errors, errors
                    assert not external, external
                    context.close()
                finally:
                    browser.close()
        finally:
            server.shutdown()
            thread.join(timeout=5)
    print("Static Academy Chromium acceptance: PASS")


if __name__ == "__main__":
    main()
