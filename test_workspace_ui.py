"""Static navigation and runbook contract; browser behavior is tested separately."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parent


class Workspace(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.pages = {}
        self.targets = []
        self.anchors = []
        self.commands = []
        self.copies = []
        self.active = []
        self._command = None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.append(a["id"])
        if tag == "section" and "page" in a.get("class", "").split():
            self.pages[a["id"]] = "hidden" in a
        for key in ("data-page", "data-open-page"):
            if key in a:
                self.targets.append(a[key])
        if "data-page" in a and "active" in a.get("class", "").split():
            self.active.append(a["data-page"])
        if tag == "a" and a.get("href", "").startswith("#deploy-"):
            self.anchors.append(a["href"][1:])
        if tag == "div" and "deploy-command" in a.get("class", "").split():
            self._command = []
        if tag == "button" and self._command is not None and "data-prompt" in a:
            self.copies.append(a["data-prompt"])

    def handle_data(self, data):
        if self._command is not None:
            self._command.append(data)

    def handle_endtag(self, tag):
        if tag == "pre" and self._command is not None:
            # The only text preceding the pre is the runbook heading.
            self.commands.append("".join(self._command))
        if tag == "div" and self._command is not None:
            self._command = None


class WorkspaceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "web/index.html").read_text(encoding="utf-8")
        cls.dom = Workspace(cls.html)

    def test_unique_ids(self):
        self.assertEqual(len(self.dom.ids), len(set(self.dom.ids)))

    def test_all_targets_exist(self):
        self.assertFalse(set(self.dom.targets) - self.dom.pages.keys())
        self.assertEqual(set(self.dom.pages), set(self.dom.targets))
        self.assertEqual(self.dom.active, ["home"])
        self.assertEqual([k for k, v in self.dom.pages.items() if not v], ["home"])
        self.assertEqual(len(self.dom.pages), 23)
        self.assertIn("hub", self.dom.pages)
        self.assertIn("models", self.dom.pages)

    def test_deployment_cards(self):
        self.assertEqual(len(self.dom.anchors), 9)
        self.assertEqual(len(set(self.dom.anchors)), 9)
        self.assertFalse(set(self.dom.anchors) - set(self.dom.ids))
        self.assertIn("deploy", self.dom.pages)

    def test_copy_matches_display(self):
        self.assertGreaterEqual(len(self.dom.copies), 18)
        self.assertEqual(len(self.dom.commands), len(self.dom.copies))
        for shown, copied in zip(self.dom.commands, self.dom.copies):
            self.assertTrue(shown.endswith(copied), repr(copied))
            self.assertTrue(copied.strip())
        self.assertNotIn("down -v", "\n".join(self.dom.copies))

    def test_core_components_remain(self):
        for ident in ("hub-grid", "hub-detail", "interview-pro-center",
                      "v11-study", "v12-drafts", "v11-mock", "v12-labs",
                      "production-center", "lab-command", "test-output"):
            self.assertIn(ident, self.dom.ids)


if __name__ == "__main__":
    unittest.main()
