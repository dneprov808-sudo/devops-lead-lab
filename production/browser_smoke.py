"""Isolated Chromium DOM smoke; fake network/storage, exact production.js."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]

def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=os.environ.get('ACADEMY_CHROMIUM') or None)
        page = browser.new_page(viewport={'width':390,'height':844})
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content('<meta charset="utf-8"><div id="production-center"></div>')
        page.evaluate('''() => {
            window.fixtureAvailable = true;
            window.fetch = async () => ({ok:true,json:async()=>window.fixtureAvailable?{status:"available",metrics:{accepted:11,processed:1,pending:10}}:{status:"unavailable"}});
            const data = new Map();
            Object.defineProperty(window,"localStorage",{value:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))}});
        }''')
        page.add_script_tag(content=(ROOT / 'web/production.js').read_text())
        expect(page.get_by_text('Очередь: 10', exact=False)).to_be_visible()
        page.evaluate('window.fixtureAvailable = false')
        page.get_by_role('button', name='Обновить реальные метрики').click()
        expect(page.get_by_text('Стенд недоступен или метрики невалидны.')).to_be_visible()
        cmd = page.get_by_label('Команда симулятора')
        cmd.fill('kubectl describe pod worker')
        cmd.press('Enter')
        expect(page.get_by_text('Reason: OOMKilled', exact=False)).to_be_visible()
        cmd.fill('echo host')
        cmd.press('Enter')
        expect(page.get_by_text('Команда не входит в симулятор.', exact=False)).to_be_visible()
        editor = page.get_by_label('JSON конфигурация')
        editor.fill('{')
        page.get_by_role('button', name='Проверить фрагмент').click()
        expect(page.get_by_text('Некорректный JSON.')).to_be_visible()
        page.get_by_label('FROM python:latest').check()
        page.get_by_label('ENV DB_PASSWORD=synthetic-example').check()
        page.get_by_role('button', name='Проверить выбор').click()
        expect(page.get_by_text('Найдено 2/2', exact=False)).to_be_visible()
        page.get_by_label('Kafka', exact=True).check()
        expect(page.locator('pre').filter(has_text='Kafka')).to_be_visible()
        page.evaluate("localStorage.setItem('academy-bookmarks-v7', '[\"Kafka\"]')")
        page.get_by_role('button', name='Подготовить JSON').click()
        assert json.loads(page.get_by_label('Резервная копия').input_value())['data']['academy-bookmarks-v7'] == ['Kafka']
        assert page.evaluate("localStorage.getItem('academy-bookmarks-v7')") == '["Kafka"]'
        assert not errors, errors
        browser.close()
    print('PASS: isolated browser smoke, metric states, terminal, editor, review, design, export; no page errors')

if __name__ == '__main__':
    main()
