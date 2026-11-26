import importlib.util, pathlib,tempfile,unittest
root=pathlib.Path(__file__).resolve().parent/"v12-labs/cicd"
spec=importlib.util.spec_from_file_location("pipeline_v12",root/"pipeline.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class PipelineV12(unittest.TestCase):
    def test_promotion_identity(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=pathlib.Path(tmp);bundle=base/"bundle";dest=base/"release"
            sha=m.build(root/"source.json",bundle)
            self.assertEqual(m.verify(bundle),sha)
            self.assertEqual(m.promote(bundle,dest,sha),sha)
            self.assertEqual((bundle/"artifact.json").read_bytes(),(dest/"artifact.json").read_bytes())
            with self.assertRaises(FileExistsError):m.promote(bundle,dest,sha)
    def test_tampered_and_wrong_approval(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=pathlib.Path(tmp);bundle=base/"bundle";dest=base/"release"
            m.build(root/"source.json",bundle)
            with self.assertRaises(ValueError):m.promote(bundle,dest,"0"*64)
            self.assertFalse(dest.exists())
            (bundle/"artifact.json").write_text("{}")
            with self.assertRaises(ValueError):m.verify(bundle)
