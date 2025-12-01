import requests
import json

nzbn = "9429053229694"
url = f"http://localhost:8000/api/v1/companies/{nzbn}"

try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}\n")
    
    if response.status_code == 200:
        data = response.json()
        
        # Print summary
        print("=" * 60)
        print("DATA SUMMARY")
        print("=" * 60)
        
        categories = {
            "Core Info": ["NZBN", "ENTITY_NAME", "ENTITY_STATUS"],
            "Basic Extensions": ["abn", "gst", "industry_classification", "trading_names", "websites"],
            "Addresses": ["addresses"],
            "People": ["directors", "shareholders"],
            "Business": ["trading_areas"],
            "Compliance": ["insolvency"],
            "Special": ["special_entity"]
        }
        
        for category, keys in categories.items():
            print(f"\n{category}:")
            for key in keys:
                if key in data:
                    value = data[key]
                    if isinstance(value, list):
                        print(f"  ✓ {key}: {len(value)} records")
                    elif isinstance(value, dict):
                        if key == "addresses":
                            total = sum(len(v) for v in value.values())
                            print(f"  ✓ {key}: {total} total ({', '.join(f'{k}: {len(v)}' for k, v in value.items())})")
                        elif key == "special_entity":
                            count = sum(1 for v in value.values() if v is not None)
                            print(f"  ✓ {key}: {count} types found")
                        else:
                            print(f"  ✓ {key}: {value}")
                    elif value is not None:
                        print(f"  ✓ {key}: Present")
                    else:
                        print(f"  ✗ {key}: None")
                else:
                    print(f"  ✗ {key}: Missing")
        
        print("\n" + "=" * 60)
        print("Sample Data:")
        print("=" * 60)
        if data.get("industry_classification"):
            print(f"\nIndustry: {json.dumps(data['industry_classification'][0], indent=2, default=str)}")
        if data.get("trading_names"):
            print(f"\nTrading Names: {json.dumps(data['trading_names'], indent=2, default=str)}")
            
except Exception as e:
    print(f"Error: {e}")
