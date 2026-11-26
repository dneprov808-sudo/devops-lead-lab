"""Contract tests with stubbed external clients, no Docker or network."""
import importlib.util
import pathlib
import sys
import types
import unittest
from unittest.mock import MagicMock,patch
ROOT=pathlib.Path(__file__).resolve().parent
def load_app():
    psycopg=types.ModuleType("psycopg");psycopg.Error=type("Error",(Exception,),{})
    redis=types.ModuleType("redis");redis.RedisError=type("RedisError",(Exception,),{})
    kafka=types.ModuleType("confluent_kafka");kafka.Producer=kafka.Consumer=object
    spec=importlib.util.spec_from_file_location("orders_app_v12",ROOT/"production_v11/app.py")
    module=importlib.util.module_from_spec(spec)
    with patch.dict(sys.modules,{"psycopg":psycopg,"redis":redis,"confluent_kafka":kafka}):
        spec.loader.exec_module(module)
    return module

class ProductionReadContract(unittest.TestCase):
    def setUp(self):
        self.app=load_app();self.db=MagicMock();self.conn=self.db.return_value.__enter__.return_value
    def test_db_only_never_contacts_cache(self):
        self.conn.execute.return_value.fetchone.return_value=(True,)
        with patch.object(self.app,"db",self.db),patch.object(self.app,"cache",side_effect=AssertionError("Cache must not be contacted")):
            self.assertEqual(self.app.order("id-1",use_cache=False),{"id":"id-1","done":True,"source":"database"})
            self.conn.execute.return_value.fetchone.return_value=None
            self.assertIsNone(self.app.order("id-2",use_cache=False))
    def test_cache_path_retained(self):
        client=MagicMock();client.get.return_value="1"
        with patch.object(self.app,"db",self.db),patch.object(self.app,"cache",return_value=client):
            self.assertEqual(self.app.order("id-1"),{"id":"id-1","done":True,"source":"cache"})
            self.db.assert_not_called()
    def test_cache_unavailable_falls_back(self):
        self.conn.execute.return_value.fetchone.return_value=(True,)
        with patch.object(self.app,"db",self.db),patch.object(self.app,"cache",side_effect=self.app.redis.RedisError):
            self.assertEqual(self.app.order("id-1")["source"],"database")
    def test_stats_one_statement(self):
        self.conn.execute.return_value.fetchone.return_value=(10,8,1)
        with patch.object(self.app,"db",self.db):
            self.assertEqual(self.app.stats(),{"accepted":10,"processed":8,"pending":2,"pending_publish":1})
        self.conn.execute.assert_called_once()
        self.assertIn("SELECT count(*) FROM outbox",self.conn.execute.call_args.args[0])
