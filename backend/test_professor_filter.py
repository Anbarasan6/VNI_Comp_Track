import urllib.request, json, urllib.error, time, sys

BASE = 'http://localhost:8000/api'

def req(method, path, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    body = json.dumps(data).encode() if data else None
    r = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp: return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read())

# Admin login
_, resp = req('POST', '/auth/login', {'email': 'admin@vni.com', 'password': 'Admin@123'})
admin_token = resp.get('access_token', '')
print('Admin token:', 'OK' if admin_token else 'FAIL')

# Sales rep login
_, resp = req('POST', '/auth/login', {'email': 'testrep@vni.com', 'password': 'Rep@12345'})
rep_token = resp.get('access_token', '')
_, me = req('GET', '/auth/me', None, rep_token)
rep_id = me.get('id')
print('Sales rep ID:', rep_id)

# Create a professor with NO sales_person_id (admin creates without assigning)
ts = str(int(time.time()))[-5:]
mobile_unassigned = '80000' + ts
code, prof_un = req('POST', '/professors',
    {'title': 'Dr', 'name': 'Unassigned Prof ' + ts, 'mobile': mobile_unassigned, 'college_name': 'Free College'},
    admin_token)
print('\nCreated unassigned professor:', code)
print('  ID:', prof_un.get('id'), '| sales_person_id:', prof_un.get('sales_person_id'), '(expected: None)')
un_id = prof_un.get('id')

# Create professor assigned to sales rep
ts2 = str(int(time.time()))[-5:]
mobile_assigned = '90000' + ts2
code, prof_ass = req('POST', '/professors',
    {'title': 'Prof', 'name': 'Rep Assigned ' + ts2, 'mobile': mobile_assigned, 'college_name': 'Rep College'},
    rep_token)
print('\nCreated rep-assigned professor:', code)
print('  ID:', prof_ass.get('id'), '| sales_person_id:', prof_ass.get('sales_person_id'), '(expected:', rep_id, ')')

# ─── Test 1: Sales rep search should see BOTH (own + unassigned) ───────────
code, results = req('GET', '/professors?per_page=100', None, rep_token)
profs = results.get('data', [])
unassigned_visible = [p for p in profs if p['sales_person_id'] is None]
own_visible       = [p for p in profs if p['sales_person_id'] == rep_id]
print('\n[TEST 1] Sales rep sees', len(profs), 'professors total')
print('  Unassigned (None):', len(unassigned_visible))
print('  Own (rep_id={0}): {1}'.format(rep_id, len(own_visible)))
t1 = any(p['id'] == un_id for p in profs)
print('  Can see unassigned prof:', 'PASS' if t1 else 'FAIL')

# ─── Test 2: Sales rep claims unassigned professor ──────────────────────────
print('\n[TEST 2] Sales rep claiming professor ID:', un_id)
code, updated = req('PUT', '/professors/' + str(un_id), {'sales_person_id': rep_id}, rep_token)
print('  Update:', code, '| sales_person_id now:', updated.get('sales_person_id'), '(expected:', rep_id, ')')
t2 = code == 200 and updated.get('sales_person_id') == rep_id
print('  Result:', 'PASS' if t2 else 'FAIL')

# ─── Test 3: After claim, create Rep2 and verify they CANNOT see it ─────────
print('\n[TEST 3] Create Rep2 and check visibility')
code, _ = req('POST', '/users',
    {'name': 'Rep2 Test', 'email': 'rep2test@vni.com', 'password': 'Rep2@12345', 'role': 'sales_rep'},
    admin_token)
print('  Create Rep2:', code, '(201=new, 409=exists)')
code, resp2 = req('POST', '/auth/login', {'email': 'rep2test@vni.com', 'password': 'Rep2@12345'})
rep2_token = resp2.get('access_token', '')
code, results3 = req('GET', '/professors?per_page=100', None, rep2_token)
profs3 = results3.get('data', [])
rep2_sees_claimed = any(p['id'] == un_id for p in profs3)
rep2_unassigned   = [p for p in profs3 if p['sales_person_id'] is None]
print('  Rep2 sees {} professors'.format(len(profs3)))
print('  Rep2 sees the claimed professor:', 'FAIL (should NOT see it!)' if rep2_sees_claimed else 'PASS (correctly hidden)')
print('  Rep2 sees unassigned professors:', len(rep2_unassigned))

# ─── Test 4: Original rep still sees it after claim ─────────────────────────
code, results4 = req('GET', '/professors?per_page=100', None, rep_token)
profs4 = results4.get('data', [])
rep1_sees_claimed = any(p['id'] == un_id for p in profs4)
print('\n[TEST 4] Rep1 still sees claimed professor:', 'PASS' if rep1_sees_claimed else 'FAIL')

# ─── Test 5: Admin sees ALL professors ──────────────────────────────────────
code, results5 = req('GET', '/professors?per_page=200', None, admin_token)
profs5 = results5.get('data', [])
print('\n[TEST 5] Admin sees', len(profs5), 'professors (should be all)')

print('\n' + '='*50)
all_pass = t1 and t2 and not rep2_sees_claimed and rep1_sees_claimed
print('ALL TESTS:', 'PASSED' if all_pass else 'SOME FAILED')
print('='*50)
