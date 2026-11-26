import tempfile, unittest, uuid
from pathlib import Path
from learning_store import Store, now
from assessment_v12 import binding, decide, report
class AssessmentV12(unittest.TestCase):
    def setUp(self):
        t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup)
        self.s=Store(Path(t.name)/"db",{"Q-001":{"topic":"Linux","level":"lead"}})
        self.a=self.event("attempt",{"question_id":"Q-001","answer":"evidence","score":4,"error":""})
        self.p=self.proposal(3)
    def event(self,kind,data):
        x={"id":str(uuid.uuid4()),"kind":kind,"created_at":now(),"data":data};self.s.add(x);return x["id"]
    def proposal(self,score):
        return self.event("review_proposal",{"attempt_id":self.a,"question_id":"Q-001","score":score,"reviewer":"candidate reviewer","evidence":"synthetic","error":"","commit":None})
    def sha(self,p):
        with self.s.connect() as c:return binding(c,p)[2]
    def accept(self,p):
        return decide(self.s,p,self.sha(p),"accept","human reviewer","local-review-1")
    def test_review_is_not_self_score(self):
        self.assertEqual(report(self.s)["reviewed_questions"],[])
        self.accept(self.p)
        self.assertEqual(report(self.s)["reviewed_questions"][0]["score"],3)
        self.assertEqual(report(self.s)["canonical_grade"],"unchanged")
        self.assertEqual(self.accept(self.p)["decision"],"accept")
    def test_stale_and_conflict(self):
        with self.assertRaises(ValueError):decide(self.s,self.p,"0"*64,"accept","human","review")
        self.accept(self.p)
        with self.assertRaises(ValueError):decide(self.s,self.p,self.sha(self.p),"reject","human","review")
        self.accept(self.proposal(1))
        self.assertEqual(report(self.s)["conflicts"],1)
        self.assertEqual(report(self.s)["reviewed_questions"],[])
    def test_ai_cannot_be_operator(self):
        with self.assertRaises(ValueError):decide(self.s,self.p,self.sha(self.p),"accept","Ollama","review")
