"""Independent synthetic release fixture. No external deployment, no network."""
import argparse, hashlib, json, os, pathlib, shutil, sys
ROOT=pathlib.Path(__file__).resolve().parent
def digest(data):return hashlib.sha256(data).hexdigest()
def build(source,output):
    if source.stat().st_size>64*1024:raise ValueError("Synthetic source too large")
    data=json.loads(source.read_text())
    if set(data)!={"name","version","message"} or data["name"]!="academy-demo" or not all(isinstance(v,str) and 0<len(v)<=200 for v in data.values()):raise ValueError("Invalid artifact")
    raw=(json.dumps(data,sort_keys=True,separators=(",",":"))+"\n").encode()
    output.mkdir(mode=0o700,parents=False,exist_ok=False)
    (output/"artifact.json").write_bytes(raw)
    (output/"sha256.txt").write_text(digest(raw)+"\n")
    return digest(raw)
def verify(bundle):
    raw=(bundle/"artifact.json").read_bytes();expected=(bundle/"sha256.txt").read_text().strip()
    if len(raw)>64*1024 or digest(raw)!=expected:raise ValueError("Digest mismatch")
    data=json.loads(raw)
    if set(data)!={"name","version","message"} or data["name"]!="academy-demo":raise ValueError("Invalid synthetic release")
    return expected
def promote(bundle,dest,expected):
    actual=verify(bundle)
    if actual!=expected:raise ValueError("Reviewed digest mismatch")
    dest.mkdir(mode=0o700,parents=False,exist_ok=False)
    for name in ("artifact.json","sha256.txt"):
        with (dest/name).open("xb") as f:f.write((bundle/name).read_bytes())
    if verify(dest)!=expected:raise ValueError("Promoted bytes changed")
    return actual
def main():
    p=argparse.ArgumentParser();s=p.add_subparsers(dest="action",required=True)
    b=s.add_parser("build");b.add_argument("source",type=pathlib.Path);b.add_argument("output",type=pathlib.Path)
    v=s.add_parser("verify");v.add_argument("bundle",type=pathlib.Path)
    x=s.add_parser("promote");x.add_argument("bundle",type=pathlib.Path);x.add_argument("dest",type=pathlib.Path);x.add_argument("expected")
    a=p.parse_args()
    if a.action=="build":print(build(a.source,a.output))
    elif a.action=="verify":print(verify(a.bundle))
    else:print(promote(a.bundle,a.dest,a.expected))
if __name__=="__main__":main()
