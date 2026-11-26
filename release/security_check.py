"""Static guardrails, not a vulnerability scanner. No network and no credentials read."""
from pathlib import Path
import re
import yaml
ROOT=Path(__file__).resolve().parents[1]

def check():
    errors=[]
    for path in ROOT.glob("*/compose*.yaml"):
        data=yaml.safe_load(path.read_text())
        for name,svc in data.get("services",{}).items():
            if svc.get("privileged") or svc.get("network_mode")=="host":
                errors.append(f"{path.name}:{name}: unsafe isolation")
            for port in svc.get("ports",[]):
                if not isinstance(port,str) or not port.startswith("127.0.0.1:"):
                    errors.append(f"{path.name}:{name}: non-loopback port")
            for volume in svc.get("volumes",[]):
                if "/var/run/docker.sock" in str(volume):
                    errors.append(f"{path.name}:{name}: docker socket")
    p=(ROOT/"portal.py").read_text()
    for literal in ['HOST = "127.0.0.1"', 'allowed(self.headers, mutate=True)', 'Content-Security-Policy']:
        if literal not in p: errors.append("portal guard missing: "+literal)
    if re.search(r"shell\s*=\s*True",p): errors.append("portal shell=True")
    return errors
if __name__=="__main__":
    errors=check()
    print("\n".join(errors) if errors else "PASS: static isolation guardrails (not a security audit)")
    raise SystemExit(bool(errors))
