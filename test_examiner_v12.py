import tempfile, unittest, uuid
from pathlib import Path
from learning_store import Store, now
from examiner_v12 import proposal
class ExaminerV12(unittest.TestCase):
    def test_proposal_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            s=Store(Path(tmp)/"db",{"Q-001":{"question":"Q","answer":"reference","rubric":"rubric"}})
            a={"id":str(uuid.uuid4()),"kind":"attempt","created_at":now(),"data":{"question_id":"Q-001","answer":"student","score":None,"error":""}}
            s.add(a)
            result,follow=proposal(s,a["id"],"Q-001","local",lambda *args:{"score":2,"evidence":"partial","error":"gap","follow_up":"why?"})
            self.assertEqual(follow,"why?")
            self.assertEqual(result["reviews"][0]["data"]["score"],2)
            self.assertEqual(s.summary()["review_proposals"],0)
            with self.assertRaises(ValueError):
                proposal(s,a["id"],"Q-001","local",lambda *args:{"score":5,"evidence":"bad","error":"","follow_up":"why?"})
