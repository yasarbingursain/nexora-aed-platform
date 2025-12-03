# MalGenX Service - Real-Time Malware Intelligence

## Overview
Enterprise-grade malware analysis service integrated with **MalwareBazaar API** (abuse.ch) for real-time threat intelligence.

## Data Source
- **API**: MalwareBazaar (https://mb-api.abuse.ch)
- **Provider**: abuse.ch - Swiss non-profit organization
- **Data**: Real-time malware samples, hashes, signatures, and IOCs
- **Update Frequency**: Every 10 minutes

## Setup Instructions

### 1. Get FREE MalwareBazaar API Key
1. Visit: https://bazaar.abuse.ch/api/
2. Click "Register" (FREE, no credit card required)
3. Verify your email
4. Copy your API key from the dashboard

### 2. Configure API Key
Add your API key to `backend-malgenx/app/services/malwarebazaar.py`:

```python
MALWAREBAZAAR_API_KEY = "your-api-key-here"
```

### 3. Start the Service
```bash
cd backend-malgenx
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 4. Verify Data Sync
Check logs for:
```
✅ Fetched X real malware samples from MalwareBazaar
✅ Synced X new malware samples from MalwareBazaar
```

## Features
- ✅ Real-time malware samples from MalwareBazaar
- ✅ SHA256, MD5, SHA1 hashes
- ✅ Malware signatures and families
- ✅ File types and sizes
- ✅ Risk scoring and categorization
- ✅ IOC extraction (hashes)
- ✅ Auto-sync every 10 minutes
- ✅ Enterprise-grade data quality

## API Endpoints
- `GET /health` - Service health check
- `GET /api/v1/samples` - List malware samples
- `GET /api/v1/samples/{id}` - Get sample details
- `POST /api/v1/samples` - Submit new sample
- `GET /api/v1/threats/feed` - Real-time threat feed

## Data Structure
Each malware sample includes:
- **Hashes**: SHA256, MD5, SHA1
- **Signature**: Malware family/variant name
- **File Info**: Type, size, name
- **Metadata**: First seen, reporter, origin country
- **Risk**: Score (0-1) and level (low/medium/high/critical)
- **Category**: Ransomware, Trojan, Backdoor, etc.
- **Tags**: Additional classification tags
- **IOCs**: Extracted indicators of compromise

## Without API Key
The service will log warnings and return empty results. **API key is required** for production use.

## Support
- MalwareBazaar Docs: https://bazaar.abuse.ch/api/
- abuse.ch Twitter: @abuse_ch
- Contact: contact@abuse.ch
