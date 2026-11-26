"""Scan committed source only. Missing tools or a failed scan never produce PASS."""
import contextlib
import pathlib
import shutil
import subprocess
import sys
import tarfile
import tempfile

ROOT=pathlib.Path(__file__).resolve().parents[1]

@contextlib.contextmanager
def committed_source(root=ROOT):
    root=pathlib.Path(root)
    if subprocess.run(["git","diff","--quiet","HEAD","--"],cwd=root,timeout=20).returncode:
        raise ValueError("Commit tracked changes before scanning; untracked data is not scanned")
    sha=subprocess.check_output(["git","rev-parse","--verify","HEAD"],cwd=root,text=True,timeout=10).strip()
    with tempfile.TemporaryDirectory(prefix="academy-security-") as tmp:
        temp=pathlib.Path(tmp); archive=temp/"source.tar"; dest=temp/"source";dest.mkdir(mode=0o700)
        with archive.open("wb") as f:
            subprocess.run(["git","archive","--format=tar",sha],cwd=root,stdout=f,check=True,timeout=60)
        with tarfile.open(archive) as tar:
            members=tar.getmembers()
            if any(not (m.isfile() or m.isdir()) for m in members):
                raise ValueError("Unsupported archive member")
            tar.extractall(dest,members=members,filter="data")
        # A committed private directory is itself a release blocker.
        if any((dest/x).exists() for x in (".academy-data",".venv",".env")):
            raise ValueError("Private data path tracked; review without uploading it")
        yield sha,dest

def commands():
    return [
        ["pip-audit","--strict","--requirement","requirements-v11-dev.txt"],
        ["pip-audit","--strict","--requirement","production_v11/requirements.txt"],
        ["trivy","fs","--scanners","vuln,misconfig","--severity","HIGH,CRITICAL","--exit-code","1","."],
        ["trivy","fs","--scanners","secret","--exit-code","1","."],
    ]

def main():
    for tool in ("trivy","pip-audit"):
        if not shutil.which(tool):
            print("BLOCKED: install "+tool+" in the dedicated review environment",file=sys.stderr)
            return 125
    try:
        with committed_source() as (sha,source):
            print("Scanning committed SHA "+sha,flush=True)
            codes=[]
            for cmd in commands():
                try: codes.append(subprocess.run(cmd,cwd=source,timeout=300).returncode)
                except (OSError,subprocess.TimeoutExpired): codes.append(125)
            return 125 if 125 in codes else int(any(codes))
    except (OSError,ValueError,subprocess.SubprocessError,tarfile.TarError) as e:
        print("BLOCKED: "+str(e),file=sys.stderr)
        return 125
if __name__=="__main__": sys.exit(main())
