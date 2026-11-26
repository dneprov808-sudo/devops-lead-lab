import pathlib
import subprocess
import yaml

ROOT = pathlib.Path(__file__).resolve().parent

def check(docs, replicas):
    deployments = [d for d in docs if d and d.get('kind') == 'Deployment']
    services = [d for d in docs if d and d.get('kind') == 'Service']
    if len(deployments) != 1 or len(services) != 1:
        return False
    spec = deployments[0]['spec']
    labels = spec['template']['metadata']['labels']
    selector = services[0]['spec'].get('selector', {})
    return (spec['replicas'] == replicas and bool(selector) and all(labels.get(k) == v for k,v in selector.items()) and all(labels.get(k) == v for k,v in spec['selector']['matchLabels'].items()) and all(c.get('readinessProbe') for c in spec['template']['spec']['containers']))

def main():
    for n in (2, 4):
        rendered = subprocess.check_output(['helm','template','training',str(ROOT),'--set',f'replicas={n}'],text=True,timeout=30)
        if not check(list(yaml.safe_load_all(rendered)),n):
            print(f'FAIL: rendered contract for replicas={n}')
            return 1
    print('PASS: rendered contract')
    return 0

if __name__ == '__main__': raise SystemExit(main())
