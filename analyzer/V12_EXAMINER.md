# Local AI examiner v12
Use a locally downloaded model, e.g. qwen2.5:3b. Verify the daemon is yours, disable cloud functionality/forwarding before sending private answers. CLI only, fixed loopback URL, no proxy, no redirect, bounded output. The model is untrusted: its output becomes a review proposal, not confirmed skill. No automatic model pull or network calls by portal.
python examiner_v12.py ATTEMPT_UUID QUESTION_ID ~/review.json --model qwen2.5:3b --confirm-local-model
python analyzer_bridge.py ~/review.json
python analyzer_bridge.py ~/review.json --apply
Then independent human review via assessment_v12.py. The examiner prints an additional follow-up. The original separate audio analyzer raw analysis.json contract is still not available; the new direct local model path does not parse it. Source: https://ollama.com/blog/structured-outputs . Live local Ollama not tested.
