import requests
import json

# Test the API endpoint
nzbn = "9429053229694"
url = f"http://localhost:8001/api/v1/companies/{nzbn}"

try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")
    print(f"\nResponse:")
    data = response.json()
    print(json.dumps(data, indent=2, default=str))
    
    # Check directors
    if "directors" in data:
        print(f"\n\nDirectors count: {len(data['directors'])}")
        if data['directors']:
            print("First director:")
            print(json.dumps(data['directors'][0], indent=2, default=str))
    else:
        print("\nNo 'directors' key in response")
        
except Exception as e:
    print(f"Error: {e}")
