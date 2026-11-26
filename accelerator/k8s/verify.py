import json, subprocess, pathlib

def verify(deployment, slices):
    status = deployment.get('status', {})
    ready = {e['targetRef']['uid'] for s in slices['items'] for e in s.get('endpoints', []) if e.get('conditions', {}).get('ready') is True and e.get('targetRef', {}).get('kind') == 'Pod' and e.get('targetRef', {}).get('uid')}
    return status.get('observedGeneration') == deployment['metadata']['generation'] and status.get('readyReplicas') == 2 and len(ready) == 2

def main():
    config = pathlib.Path(__file__).with_name('academy-v9.kubeconfig')
    if not config.is_file(): raise SystemExit('Missing dedicated lab kubeconfig')
    def get(*args):
        return json.loads(subprocess.check_output(['kubectl','--kubeconfig',str(config),'--context','kind-academy-v9','-n','academy-v9','get',*args,'-o','json'],timeout=30))
    ok=verify(get('deployment','api'),get('endpointslices','-l','kubernetes.io/service-name=api'))
    print('PASS' if ok else 'FAIL: expected two ready endpoints and updated deployment')
    return 0 if ok else 1

if __name__ == '__main__': raise SystemExit(main())
