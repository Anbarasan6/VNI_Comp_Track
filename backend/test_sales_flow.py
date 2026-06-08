import urllib.request, json, urllib.error, sys

BASE = 'http://localhost:8000/api'

def req(method, path, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    body = json.dumps(data).encode() if data else None
    r = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def ok(label, code, expected=200):
    status = "PASS" if code == expected else "FAIL"
    print("  [{}] {} -> HTTP {}".format(status, label, code))
    return code == expected

print("=" * 60)
print("SALES REP MODULE - END TO END TEST")
print("=" * 60)

# Step 1: Admin login
print("\nSTEP 1: Admin login")
code, resp = req('POST', '/auth/login', {'email': 'admin@vni.com', 'password': 'Admin@123'})
ok("Admin login", code, 200)
admin_token = resp.get('access_token', '')

# Step 2: Create sales rep user (ignore if already exists)
print("\nSTEP 2: Create test sales_rep user")
code, resp = req('POST', '/users', {
    'name': 'Test Sales Rep', 'email': 'testrep@vni.com',
    'password': 'Rep@12345', 'role': 'sales_rep'
}, admin_token)
detail = resp.get('detail', '')
if code == 201:
    print("  [PASS] Created new sales_rep user")
elif code == 409 or 'already' in str(detail).lower() or 'exist' in str(detail).lower():
    print("  [INFO] Sales rep user already exists - OK")
else:
    print("  [FAIL] Create user: {} - {}".format(code, detail))

# Step 3: Sales rep login
print("\nSTEP 3: Sales rep login")
code, resp = req('POST', '/auth/login', {'email': 'testrep@vni.com', 'password': 'Rep@12345'})
ok("Sales rep login", code, 200)
rep_token = resp.get('access_token', '')
if not rep_token:
    print("  FATAL: Cannot login as sales rep")
    sys.exit(1)

# Step 4: Add new professor as sales rep
print("\nSTEP 4: Add new professor (as sales_rep)")
import time
mobile = "98765" + str(int(time.time()))[-5:]  # unique mobile
prof_payload = {
    'title': 'Dr',
    'name': 'Prof Tamilselvi K',
    'mobile': mobile,
    'college_name': 'PSG College of Arts and Science',
    'designation': 'Assistant Professor',
    'department': 'Department of Commerce',
    'city': 'Coimbatore',
    'pincode': '641014',
}
code, resp = req('POST', '/professors', prof_payload, rep_token)
if ok("Add professor", code, 201):
    prof_id = resp['id']
    sales_pid = resp['sales_person_id']
    print("  Professor ID: {}  Name: {}".format(prof_id, resp['name']))
    print("  College: {}".format(resp['college_name']))
    print("  sales_person_id: {}".format(sales_pid))
    if not sales_pid:
        print("  [WARN] sales_person_id is None - should be auto-set to rep's id!")
else:
    print("  Error: {}".format(resp.get('detail', resp)))
    sys.exit(1)

# Step 5: Get books
print("\nSTEP 5: Get available books")
code, resp = req('GET', '/books?per_page=10', None, rep_token)
ok("List books", code, 200)
books = resp.get('data', resp.get('items', []))
print("  Total books: {}".format(resp.get('total', len(books))))
if not books:
    print("  [FAIL] No books in database! Please add books via admin first.")
    sys.exit(1)
book = books[0]
print("  Using book: [{}] {} ({})".format(book['id'], book['title'], book['status']))

# Step 6: Create OFFICE_DISPATCH request
print("\nSTEP 6: Create OFFICE_DISPATCH request")
req_payload = {
    'professor_id': prof_id,
    'delivery_type': 'OFFICE_DISPATCH',
    'address_type': 'COLLEGE',
    'remarks': 'E2E test - office dispatch',
    'books': [{'book_id': book['id'], 'copies': 2}]
}
code, resp = req('POST', '/requests', req_payload, rep_token)
if ok("Create OFFICE_DISPATCH request", code, 201):
    office_req_id = resp['id']
    print("  Request No: {}".format(resp['request_no']))
    print("  Status: {}  (expected: REQUESTED)".format(resp['status']))
    print("  Books: {}".format(len(resp.get('books', []))))
else:
    print("  Error: {}".format(resp.get('detail', resp)))
    office_req_id = None

# Step 7: Create HAND_DELIVERY request
print("\nSTEP 7: Create HAND_DELIVERY request")
req_payload2 = {
    'professor_id': prof_id,
    'delivery_type': 'HAND_DELIVERY',
    'address_type': 'COLLEGE',
    'books': [{'book_id': book['id'], 'copies': 1}]
}
code, resp2 = req('POST', '/requests', req_payload2, rep_token)
if ok("Create HAND_DELIVERY request", code, 201):
    hand_req_id = resp2['id']
    print("  Request No: {}".format(resp2['request_no']))
    print("  Status after create: {}  (expected: REQUESTED)".format(resp2['status']))
else:
    print("  Error: {}".format(resp2.get('detail', resp2)))
    hand_req_id = None

# Step 8: Mark HAND_DELIVERY as delivered (sales rep's own request)
if hand_req_id:
    print("\nSTEP 8: Mark HAND_DELIVERY as Delivered (sales rep)")
    code, resp3 = req('PUT', '/requests/{}/deliver'.format(hand_req_id),
                      {'delivery_date': '2026-06-03T14:00:00Z'}, rep_token)
    if ok("Mark hand-delivery delivered", code, 200):
        print("  Status after deliver: {}  (expected: DELIVERED)".format(resp3['status']))
    else:
        print("  Error: {}".format(resp3.get('detail', resp3)))

# Step 9: Verify sales rep can see their requests
print("\nSTEP 9: List sales rep's own requests")
code, resp = req('GET', '/requests?page=1&per_page=5', None, rep_token)
if ok("List own requests", code, 200):
    items = resp.get('data', resp.get('items', []))
    print("  Total requests: {}".format(resp.get('total', len(items))))
    for r in items[:3]:
        print("  - {} | {} | {}".format(r['request_no'], r['delivery_type'], r['status']))

print()
print("=" * 60)
print("TEST COMPLETE")
print("=" * 60)
