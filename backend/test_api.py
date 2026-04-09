from urllib.request import urlopen
import urllib.error

try:
    r = urlopen("http://127.0.0.1:8000/api/jobs/d151115a-a9a5-409a-bf66-a6e766991308/sensitivity")
    print(r.read().decode())
except urllib.error.HTTPError as e:
    print(f"Status: {e.code}")
    print(e.read().decode())
