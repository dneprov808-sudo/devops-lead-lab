"""Bounded local metrics; never log request bodies, query strings or credentials."""
import json, logging, threading, time
from collections import defaultdict
LOCK=threading.Lock()
COUNTS=defaultdict(int)
DURATION=defaultdict(float)
START=time.monotonic()
LOG=logging.getLogger("academy.portal")
def observe(route,code,elapsed):
    with LOCK:
        COUNTS[(route,code)]+=1
        DURATION[route]+=max(0,elapsed)
    LOG.info(json.dumps({"route":route,"status":code,"duration_ms":round(elapsed*1000,2)}))
def metrics():
    with LOCK:
        out=["# TYPE academy_http_requests_total counter"]
        out.extend(f'academy_http_requests_total{{route="{route}",status="{code}"}} {n}' for (route,code),n in sorted(COUNTS.items()))
        out.append("# TYPE academy_http_request_duration_seconds_total counter")
        out.extend(f'academy_http_request_duration_seconds_total{{route="{route}"}} {n:.6f}' for route,n in sorted(DURATION.items()))
    out.append("# TYPE academy_process_uptime_seconds gauge")
    out.append(f"academy_process_uptime_seconds {time.monotonic()-START:.3f}")
    return "\n".join(out)+"\n"
