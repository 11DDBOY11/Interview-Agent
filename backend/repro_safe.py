import requests, json

BASE = 'http://127.0.0.1:8000'
session_id = 'test-feedback-loop'
payload_init = {
    'sessionId': session_id,
    'candidate': {
        'member': {
            'id': 'CAND-001',
            'name': 'Sarah Johnson',
            'jobRole': 'Senior Data Engineer',
            'yearsExperience': 20,
            'education': 'AAS Information Technology',
            'status': 'COMPLETED'
        },
        'missions': [
            { 'day': 1,  'title': 'VS Code & Python Environment Setup',    'passed': True,  'attempts': 2 },
            { 'day': 7,  'title': 'Embeddings Explained',                   'passed': True,  'attempts': 5 },
            { 'day': 8,  'title': 'Vector Databases Overview',              'passed': False, 'attempts': 4 },
            { 'day': 10, 'title': 'Retrieval & Matching Engine',            'passed': False, 'attempts': 3 },
            { 'day': 12, 'title': 'Prompt Engineering Fundamentals',        'passed': True,  'attempts': 5 },
            { 'day': 16, 'title': 'Chatbot Backend & API Integration',      'passed': True,  'attempts': 4 },
            { 'day': 22, 'title': 'Multi-Agent Orchestration',              'passed': False, 'attempts': 3 },
            { 'day': 27, 'title': 'Security, Privacy & Guardrails',         'skipped': True },
            { 'day': 28, 'title': 'Docker & Kubernetes Deployment',         'skipped': True },
            { 'day': 31, 'title': 'Capstone Project & Final Demo',          'passed': True,  'attempts': 3 }
        ],
        'signals': { 'commitDays': 22, 'missionsCompleted': 23, 'missionsFirstTry': 1 }
    }
}
print('INIT')
requests.post(f'{BASE}/api/interview', json=payload_init)

for i in range(25):
    payload = {'sessionId': session_id, 'message': 'Gibberish potato salad ' * 5}
    r = requests.post(f'{BASE}/api/interview', json=payload)
    if not r.ok:
        print('HTTP Error:', r.status_code, r.text)
        break
    resp = r.json()
    done_val = resp.get('done')
    print('Turn', i, 'Done:', done_val)
    if done_val:
        print('FEEDBACK JSON:')
        print(json.dumps(resp.get('feedback'), indent=2))
        break
