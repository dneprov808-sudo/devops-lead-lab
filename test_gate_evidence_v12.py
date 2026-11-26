import importlib.util, os, pathlib, subprocess, sys, tempfile, unittest, json
p=pathlib.Path(__file__).resolve().parent/"release/gate_evidence.py"
spec=importlib.util.spec_from_file_location("gate_evidence",p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class GateEvidence(unittest.TestCase):
    def test_status(self):
        self.assertEqual(m.classify([{"status":"PASS"}],True,True),"PASS")
        self.assertEqual(m.classify([{"status":"PASS"}],False,True),"BLOCKED")
        self.assertEqual(m.classify([{"status":"BLOCKED"}],True,True),"BLOCKED")
        self.assertEqual(m.classify([{"status":"BLOCKED"},{"status":"FAIL"}],True,True),"FAIL")
        self.assertEqual(m.classify([],True,True),"BLOCKED")
    def test_process_and_environment(self):
        with tempfile.TemporaryDirectory() as tmp:
            e={**os.environ,"ACADEMY_DATA_DIR":tmp}
            code="import os,sys; sys.exit(0 if os.environ['ACADEMY_DATA_DIR']==sys.argv[1] else 1)"
            self.assertEqual(m.run_check([sys.executable,"-c",code,tmp],tmp,e)["status"],"PASS")
            self.assertEqual(m.run_check(["/no-such-academy-executable"],tmp,e)["status"],"BLOCKED")
            self.assertEqual(m.run_check([sys.executable,"-c","import time; time.sleep(2)"],tmp,e,timeout=.05)["status"],"BLOCKED")
            self.assertEqual(m.run_check([sys.executable,"-c","raise SystemExit(1)"],tmp,e)["status"],"FAIL")
    def test_report_non_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=pathlib.Path(tmp)/"report.json"
            m.save_report(path,{"status":"PASS"})
            self.assertEqual(json.loads(path.read_text()),{"status":"PASS"})
            self.assertEqual(path.stat().st_mode&0o777,0o600)
            with self.assertRaises(FileExistsError):m.save_report(path,{"status":"FAIL"})
            self.assertEqual(json.loads(path.read_text()),{"status":"PASS"})
    def test_snapshot(self):
        with tempfile.TemporaryDirectory() as tmp:
            def git(*args):return subprocess.check_output(["git",*args],cwd=tmp,text=True).strip()
            git("init","-q");git("config","user.name","synthetic");git("config","user.email","fixture@example.invalid")
            p=pathlib.Path(tmp)/"a";p.write_text("a");git("add","a");git("commit","-qm","fixture")
            snap=m.snapshot(tmp)
            self.assertEqual(snap["commit"],git("rev-parse","HEAD"))
            self.assertIs(snap["tracked_clean"],True)
            (pathlib.Path(tmp)/"private.txt").write_text("private fixture")
            self.assertIs(m.snapshot(tmp)["untracked_clean"],False)
            (pathlib.Path(tmp)/"private.txt").unlink()
            self.assertEqual(m.snapshot(tmp),snap)
            p.write_text("b");self.assertIs(m.snapshot(tmp)["tracked_clean"],False)
