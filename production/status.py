"""Read-only bounded request to the local training API."""
import http.client
import json

def read_status(port=18088):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=2)
    try:
        conn.request("GET", "/stats", headers={"Accept": "application/json"})
        response = conn.getresponse()
        raw = response.read(1025)
        if response.status != 200 or len(raw) > 1024:
            raise ValueError("invalid response")
        data = json.loads(raw)
        keys = {"accepted", "processed", "pending"}
        if not isinstance(data, dict) or set(data) != keys or any(type(data[k]) is not int or data[k] < 0 for k in keys):
            raise ValueError("invalid metrics")
        if data["accepted"] != data["processed"] + data["pending"]:
            raise ValueError("inconsistent metrics")
        return {"status": "available", "metrics": data}
    except (OSError, http.client.HTTPException, ValueError):
        return {"status": "unavailable"}
    finally:
        conn.close()
