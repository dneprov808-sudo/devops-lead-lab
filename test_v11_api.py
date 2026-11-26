import http.client, json, os, tempfile, threading, unittest, uuid
from unittest.mock import patch
from http.server import ThreadingHTTPServer
import portal
class V11APITest(unittest.TestCase):
    def test_local_store_routes(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ,{"ACADEMY_DATA_DIR":tmp}):
            server=ThreadingHTTPServer(("127.0.0.1",0),portal.Handler)
            thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
            def req(method,path,data=None,auth=False):
                c=http.client.HTTPConnection("127.0.0.1",server.server_port,timeout=5)
                headers={"Host":"localhost:8080"}
                if auth: headers.update({"Origin":"http://localhost:8080","X-Academy-CSRF":portal.KEY,"Content-Type":"application/json"})
                c.request(method,path,None if data is None else json.dumps(data),headers)
                r=c.getresponse();result=(r.status,r.read());c.close();return result
            try:
                q=next(iter(portal.learning_store.questions()))
                row={"id":str(uuid.uuid4()),"kind":"attempt","created_at":portal.learning_store.now(),"data":{"question_id":q,"answer":"local synthetic","score":2,"error":"test"}}
                self.assertEqual(req("POST","/api/v11/event",row)[0],403)
                self.assertEqual(req("POST","/api/v11/event",row,True)[0],200)
                self.assertEqual(json.loads(req("GET","/api/v11/export")[1])["events"][0]["data"]["answer"],"local synthetic")
                self.assertEqual(json.loads(req("GET","/api/v11/summary")[1])["canonical_grade"],"unchanged")
                self.assertEqual(json.loads(req("GET","/api/v11/health")[1])["storage"]["schema_version"],1)
                self.assertIn(b'academy_http_requests_total',req("GET","/api/v11/metrics")[1])
                self.assertEqual(req("GET","/.academy-data/learning.sqlite3")[0],404)
            finally: server.shutdown();server.server_close();thread.join()
