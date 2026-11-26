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
    def test_blank_rejection_and_zero(self):
        self.a=self.event("attempt",{"question_id":"Q-001","answer":"   ","score":None,"error":""})
        p=self.proposal(2)
        with self.s.connect() as c:sha=binding(c,p,enforce_score=False)[2]
        with self.assertRaises(ValueError):decide(self.s,p,sha,"accept","human","review")
        self.assertEqual(decide(self.s,p,sha,"reject","human","review")["decision"],"reject")
        self.accept(self.proposal(0))
        self.assertEqual(report(self.s)["reviewed_questions"][0]["score"],0)
    def test_exam_requires_full_review_and_profile_duration(self):
        topics=["Linux","Networking","Docker","Kubernetes","Terraform","Ansible","CI/CD & GitOps","SRE & Incident Management"]
        self.s.bank={"Q-"+str(i).zfill(3):{"topic":topics[(i-1)%len(topics)],"level":"lead" if i<=2 else "senior"} for i in range(1,19)}
        responses=[{"question_id":q,"answer":"synthetic answer"} for q in self.s.bank]
        for duration,expected in ((60,"invalid_profile"),(90,"awaiting_review")):
            mid=self.event("mock",{"profile":"entry","minutes":duration,"started_at":now(),"responses":responses})
            self.assertEqual(next(x["status"] for x in report(self.s)["exams"] if x["id"]==mid),expected)
        for i,row in enumerate(responses):
            p=self.event("review_proposal",{"attempt_id":mid,"question_id":row["question_id"],"score":2 if i==0 else 3,"reviewer":"candidate","evidence":"synthetic","error":"","commit":None})
            self.accept(p)
        self.assertEqual(next(x["status"] for x in report(self.s)["exams"] if x["id"]==mid),"reviewed_revision_required")
