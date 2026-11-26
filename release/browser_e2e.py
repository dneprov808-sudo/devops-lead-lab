"""Real browser -> local HTTP portal. No remote writes. Requires Playwright Chromium."""
import os, pathlib, subprocess, sys, time, tempfile, urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
def main():
    with tempfile.TemporaryDirectory() as tmp:
        env=dict(os.environ,ACADEMY_DATA_DIR=tmp)
        # Refuse to touch an already running portal.
        try:
            urllib.request.urlopen("http://127.0.0.1:8080/api/version",timeout=1).close()
        except OSError: pass
        else: raise RuntimeError("Stop the existing portal before E2E")
        proc=subprocess.Popen([sys.executable,"portal.py"],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            for _ in range(60):
                if proc.poll() is not None: raise RuntimeError("portal exited")
                try:
                    urllib.request.urlopen("http://127.0.0.1:8080/api/version",timeout=1).close()
                    break
                except OSError: time.sleep(.2)
            else: raise RuntimeError("portal startup timeout")
            with sync_playwright() as p:
                browser=p.chromium.launch(headless=True,executable_path=os.environ.get("ACADEMY_CHROMIUM") or None)
                page=browser.new_page()
                errors=[]
                page.on("pageerror",lambda e:errors.append(str(e)))
                page.goto("http://127.0.0.1:8080/",wait_until="domcontentloaded")
                page.locator('nav button[data-page="interview-pro"]').click()
                expect(page.locator("#interview-pro-center h2")).to_be_visible()
                page.locator("#interview-pro-center textarea").fill("Synthetic E2E answer")
                page.get_by_role("button",name="Показать разбор",exact=True).click()
                expect(page.get_by_text("Подробный ответ",exact=True)).to_be_visible()
                page.get_by_label("Самооценка").select_option("2")
                page.get_by_label("Ошибка",exact=True).fill("synthetic gap")
                page.get_by_role("button",name="Сохранить попытку локально").click()
                expect(page.get_by_text("Сохранено ·",exact=False)).to_be_visible()
                assert len(page.request.get("http://127.0.0.1:8080/api/v11/export").json()["events"])==1
                page.locator('nav button[data-page="mock"]').click()
                page.get_by_role("button",name="30 мин",exact=True).click()
                expect(page.locator("#mock-center textarea")).to_be_visible()
                page.get_by_role("button",name="Начать структурированное интервью").click()
                page.get_by_label("Ответ структурированного интервью").fill("resumable synthetic answer")
                page.reload(wait_until="domcontentloaded")
                page.locator('nav button[data-page="mock"]').click()
                expect(page.get_by_label("Ответ структурированного интервью")).to_have_value("resumable synthetic answer")
                assert page.request.get("http://127.0.0.1:8080/api/version").json()["release"].startswith("Academy v12")
                assert page.request.post("http://127.0.0.1:8080/api/test").status==403
                assert page.request.get("http://127.0.0.1:8080/portal.py").status==404
                assert not errors,errors
                browser.close()
        finally:
            proc.terminate()
            try: proc.wait(timeout=5)
            except subprocess.TimeoutExpired: proc.kill(); proc.wait()
if __name__=="__main__": main()
