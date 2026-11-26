"""Synthetic orders v11: durable PostgreSQL outbox, at-least-once Kafka, optional Redis cache."""
import json, os, re, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import psycopg
from confluent_kafka import Producer, Consumer
import redis

TOPIC="academy-orders-v11"
KEY=re.compile(r"[A-Za-z0-9_-]{1,64}")
def db():
    host=os.environ.get("PGHOST","postgres")
    if host not in ("postgres","pg1,pg2"): raise ValueError("Only local lab database hosts allowed")
    return psycopg.connect(host=host,dbname="postgres",
        user="postgres",password=os.environ["PGPASSWORD"],connect_timeout=3,target_session_attrs="read-write")
def cache():
    if os.environ.get("REDIS_MODE")=="sentinel":
        from redis.sentinel import Sentinel
        return Sentinel([(f"sentinel{i}",26379) for i in (1,2,3)],socket_timeout=1,socket_connect_timeout=1).master_for("academy",socket_timeout=1,socket_connect_timeout=1,decode_responses=True)
    return redis.Redis(host="redis",socket_connect_timeout=1,socket_timeout=1,decode_responses=True)
def init():
    with db() as c:
        c.execute("CREATE TABLE IF NOT EXISTS orders(id text PRIMARY KEY, done boolean NOT NULL DEFAULT false)")
        c.execute("CREATE TABLE IF NOT EXISTS outbox(id text PRIMARY KEY REFERENCES orders(id), published boolean NOT NULL DEFAULT false)")
def submit(key):
    if not isinstance(key,str) or not KEY.fullmatch(key): raise ValueError("Invalid id")
    with db() as c:
        row=c.execute("INSERT INTO orders(id) VALUES(%s) ON CONFLICT DO NOTHING RETURNING id",(key,)).fetchone()
        if row: c.execute("INSERT INTO outbox(id) VALUES(%s)",(key,))
    return bool(row)
def stats():
    with db() as c:
        # One SQL statement gives a coherent snapshot even at READ COMMITTED.
        accepted,processed,pending_publish=c.execute("""SELECT count(*), count(*) FILTER(WHERE done),
            (SELECT count(*) FROM outbox WHERE NOT published) FROM orders""").fetchone()
    return {"accepted":accepted,"processed":processed,"pending":accepted-processed,"pending_publish":pending_publish}
def order(key,use_cache=True):
    if not KEY.fullmatch(key): raise ValueError("Invalid id")
    # Cache only terminal synthetic results. /stats always checks DB.
    try:
        if use_cache and cache().get("done:"+key)=="1": return {"id":key,"done":True,"source":"cache"}
    except redis.RedisError: pass
    with db() as c: row=c.execute("SELECT done FROM orders WHERE id=%s",(key,)).fetchone()
    if row is None: return None
    if use_cache and row[0]:
        try: cache().setex("done:"+key,10,"1")
        except redis.RedisError: pass
    return {"id":key,"done":row[0],"source":"database"}
def publish_one(producer):
    # Row lock scopes concurrent publishers; ack before mark. Crash between them may duplicate.
    with db() as c:
        row=c.execute("SELECT id FROM outbox WHERE NOT published ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1").fetchone()
        if not row: return False
        key=row[0]; result=[]
        producer.produce(TOPIC,key=key,value=key,on_delivery=lambda err,msg:result.append(err))
        if producer.flush(8)!=0 or result!=[None]: raise RuntimeError("Kafka ack not confirmed")
        c.execute("UPDATE outbox SET published=true WHERE id=%s",(key,))
    return True
def process(key):
    if not KEY.fullmatch(key): raise ValueError("Invalid event")
    with db() as c:
        row=c.execute("UPDATE orders SET done=true WHERE id=%s RETURNING id",(key,)).fetchone()
        if not row: raise ValueError("Unknown order; stop, do not commit offset")
def brokers():
    value=os.environ.get("KAFKA_BOOTSTRAP","kafka:9092")
    if value not in ("kafka:9092","kafka:9092,kafka2:9092,kafka3:9092"): raise ValueError("Only local lab Kafka hosts allowed")
    return value

def worker():
    consumer=Consumer({"bootstrap.servers":brokers(),"group.id":"academy-v11-worker","enable.auto.commit":False,"auto.offset.reset":"earliest"})
    consumer.subscribe([TOPIC])
    try:
        while True:
            msg=consumer.poll(1)
            if msg is None: continue
            if msg.error(): raise RuntimeError("Kafka poll failed")
            process(msg.value().decode("utf-8"))
            result=consumer.commit(message=msg,asynchronous=False)
            if any(x.error for x in result): raise RuntimeError("Offset commit failed")
    finally: consumer.close()
class Handler(BaseHTTPRequestHandler):
    def reply(self,code,data,mime="application/json"):
        raw=json.dumps(data).encode() if mime=="application/json" else data.encode()
        self.send_response(code);self.send_header("Content-Type",mime);self.send_header("Content-Length",str(len(raw)));self.end_headers();self.wfile.write(raw)
    def do_GET(self):
        try:
            if self.path=="/health": stats();return self.reply(200,{"status":"ok","profile":os.environ.get("ACADEMY_PROFILE","v11")})
            if self.path=="/stats": return self.reply(200,stats())
            if self.path=="/metrics": return self.reply(200,"".join(f"academy_v11_{k} {v}\n" for k,v in stats().items()),"text/plain; version=0.0.4")
            if self.path.startswith("/verify/"):
                result=order(self.path.removeprefix("/verify/"),use_cache=False)
                return self.reply(200 if result else 404,result or {"error":"not found"})
            if self.path.startswith("/orders/"):
                result=order(self.path.removeprefix("/orders/"))
                return self.reply(200 if result else 404,result or {"error":"not found"})
            self.reply(404,{"error":"not found"})
        except (psycopg.Error,ValueError): self.reply(503,{"error":"unavailable"})
    def do_POST(self):
        if self.path!="/orders": return self.reply(404,{"error":"not found"})
        try:
            if self.headers.get("Transfer-Encoding") or self.headers.get_content_type()!="application/json": raise ValueError()
            size=int(self.headers.get("Content-Length","0"))
            if not 1<=size<=512: raise ValueError()
            self.connection.settimeout(3)
            data=json.loads(self.rfile.read(size))
            if not isinstance(data,dict) or set(data)!={"id"}: raise ValueError()
            created=submit(data["id"])
            self.reply(201 if created else 200,{"id":data["id"],"created":created})
        except (ValueError,OSError): self.reply(400,{"error":"invalid request"})
        except psycopg.Error: self.reply(503,{"error":"database unavailable; retry same id"})
if __name__=="__main__":
    mode=sys.argv[1]
    if mode=="init":
        for i in range(90):
            try: init();break
            except psycopg.Error: time.sleep(2)
        else: raise SystemExit("Database not ready")
    elif mode=="api": ThreadingHTTPServer(("0.0.0.0",8080),Handler).serve_forever()
    elif mode=="publisher":
        producer=Producer({"bootstrap.servers":brokers(),"enable.idempotence":True,"acks":"all","delivery.timeout.ms":7000})
        while True:
            if not publish_one(producer): time.sleep(.2)
    elif mode=="worker": worker()
    else: raise SystemExit("Unknown mode")
