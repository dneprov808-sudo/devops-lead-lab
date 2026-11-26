"""Bounded local-only synthetic load."""
import argparse
import json
import time
import uuid
import urllib.request

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--count", type=int, default=30)
    p.add_argument("--rate", type=int, default=5)
    args = p.parse_args()
    if not 1 <= args.count <= 500 or not 1 <= args.rate <= 20:
        p.error("count 1..500; rate 1..20")
    run = uuid.uuid4().hex
    for i in range(args.count):
        req = urllib.request.Request("http://127.0.0.1:18088/orders", data=json.dumps({"id":f"{run}-{i}"}).encode(), headers={"Content-Type":"application/json"})
        with urllib.request.urlopen(req, timeout=4) as response:
            if response.status != 201:
                raise RuntimeError("unexpected response")
        time.sleep(1/args.rate)
    print("Accepted:", args.count)

if __name__ == "__main__":
    main()
