import unittest
import uuid
import datetime as dt
import practice_results as p
from test_practice_history import HistoryTests

def review(score=2):
    return {"kind":"review","attempt":str(uuid.uuid4()),"module":"REVIEW-KAFKA","topic":"Kafka","score":score,"assessed":"2026-01-01"}

class ReviewContract(unittest.TestCase):
    def test_intervals(self):
        for score, days in enumerate((1,1,3,7,14)):
            row=p.normalize(review(score), [])
            self.assertEqual(row["due"], (dt.date(2026,1,1)+dt.timedelta(days=days)).isoformat())
            self.assertEqual(row["verification"], "self_reported")
    def test_reject(self):
        for changes in ({"score":True},{"module":"REVIEW-OTHER"},{"assessed":"2026-02-30"},{"topic":"unknown"},{"answer":"private"},{"due":"2026-01-02"}):
            with self.subTest(changes=changes):
                with self.assertRaises(p.SaveError):
                    p.normalize({**review(),**changes},[])
class UnifiedRoundTrip(HistoryTests):
    def test_review_round_trip(self):
        x=review()
        a=p.save(x,[],root=self.work,origins={str(self.remote)})
        b=p.save(x,[],root=self.work,origins={str(self.remote)})
        self.assertEqual(b["status"],"already_saved")
        row=self.read()["items"][0]
        self.assertEqual(row["due"],"2026-01-04")
        self.assertEqual(row["path"],a["path"])
        self.assertEqual(row["verification"],"self_reported")
        self.record()
        self.assertEqual(len(self.read()["items"]),2)
