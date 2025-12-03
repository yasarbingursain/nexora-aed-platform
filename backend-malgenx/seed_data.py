"""Seed MalGenX database with sample malware threats for demo"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from datetime import datetime, timedelta
import uuid
from app.db.session import SessionLocal
from app.db.models import MalwareSample, MalwareIOC

def seed_malware_samples():
    db = SessionLocal()
    
    try:
        # Check if we already have data
        existing_count = db.query(MalwareSample).count()
        if existing_count > 0:
            print(f"Database already has {existing_count} samples. Skipping seed.")
            return
        
        # Create sample malware threats
        samples = [
            {
                "organization_id": "default",
                "submission_type": "url",
                "url": "https://malicious-domain.evil/payload.exe",
                "priority": "critical",
                "status": "completed",
                "is_malicious": True,
                "risk_score": 0.95,
                "risk_level": "critical",
                "malware_family": "TrickBot",
                "malware_category": "Banking Trojan",
                "mitre_tactics": ["Initial Access", "Persistence", "Command and Control"],
                "mitre_techniques": ["T1566.001", "T1547.001", "T1071.001"],
                "created_at": datetime.utcnow() - timedelta(minutes=5),
                "updated_at": datetime.utcnow() - timedelta(minutes=2),
            },
            {
                "organization_id": "default",
                "submission_type": "url",
                "url": "https://phishing-site.com/login",
                "priority": "high",
                "status": "completed",
                "is_malicious": True,
                "risk_score": 0.88,
                "risk_level": "high",
                "malware_family": "PhishKit",
                "malware_category": "Credential Harvester",
                "mitre_tactics": ["Initial Access", "Credential Access"],
                "mitre_techniques": ["T1566.002", "T1056.003"],
                "created_at": datetime.utcnow() - timedelta(minutes=15),
                "updated_at": datetime.utcnow() - timedelta(minutes=10),
            },
            {
                "organization_id": "default",
                "submission_type": "url",
                "url": "https://ransomware-c2.onion/api",
                "priority": "critical",
                "status": "completed",
                "is_malicious": True,
                "risk_score": 0.98,
                "risk_level": "critical",
                "malware_family": "LockBit 3.0",
                "malware_category": "Ransomware",
                "mitre_tactics": ["Impact", "Command and Control", "Exfiltration"],
                "mitre_techniques": ["T1486", "T1071.001", "T1041"],
                "created_at": datetime.utcnow() - timedelta(minutes=30),
                "updated_at": datetime.utcnow() - timedelta(minutes=25),
            },
            {
                "organization_id": "default",
                "submission_type": "url",
                "url": "https://cryptominer-pool.xyz/worker",
                "priority": "medium",
                "status": "completed",
                "is_malicious": True,
                "risk_score": 0.72,
                "risk_level": "medium",
                "malware_family": "XMRig",
                "malware_category": "Cryptominer",
                "mitre_tactics": ["Resource Hijacking"],
                "mitre_techniques": ["T1496"],
                "created_at": datetime.utcnow() - timedelta(hours=1),
                "updated_at": datetime.utcnow() - timedelta(minutes=55),
            },
            {
                "organization_id": "default",
                "submission_type": "url",
                "url": "https://rat-command.net/beacon",
                "priority": "high",
                "status": "completed",
                "is_malicious": True,
                "risk_score": 0.91,
                "risk_level": "high",
                "malware_family": "AsyncRAT",
                "malware_category": "Remote Access Trojan",
                "mitre_tactics": ["Command and Control", "Collection", "Exfiltration"],
                "mitre_techniques": ["T1071.001", "T1113", "T1041"],
                "created_at": datetime.utcnow() - timedelta(hours=2),
                "updated_at": datetime.utcnow() - timedelta(hours=1, minutes=50),
            },
        ]
        
        created_samples = []
        for sample_data in samples:
            sample = MalwareSample(
                id=uuid.uuid4(),
                **sample_data
            )
            db.add(sample)
            created_samples.append(sample)
        
        db.commit()
        print(f"✅ Created {len(created_samples)} malware samples")
        
        # Create IOCs for the samples
        iocs = [
            {
                "sample_id": created_samples[0].id,
                "ioc_type": "domain",
                "ioc_value": "malicious-domain.evil",
                "is_validated": True,
                "is_known_malicious": True,
                "reputation_score": 0.95,
            },
            {
                "sample_id": created_samples[0].id,
                "ioc_type": "ip",
                "ioc_value": "185.220.101.42",
                "is_validated": True,
                "is_known_malicious": True,
                "reputation_score": 0.92,
            },
            {
                "sample_id": created_samples[1].id,
                "ioc_type": "domain",
                "ioc_value": "phishing-site.com",
                "is_validated": True,
                "is_known_malicious": True,
                "reputation_score": 0.88,
            },
            {
                "sample_id": created_samples[2].id,
                "ioc_type": "domain",
                "ioc_value": "ransomware-c2.onion",
                "is_validated": True,
                "is_known_malicious": True,
                "reputation_score": 0.98,
            },
            {
                "sample_id": created_samples[3].id,
                "ioc_type": "domain",
                "ioc_value": "cryptominer-pool.xyz",
                "is_validated": True,
                "is_known_malicious": True,
                "reputation_score": 0.72,
            },
        ]
        
        for ioc_data in iocs:
            ioc = MalwareIOC(
                id=uuid.uuid4(),
                first_seen=datetime.utcnow() - timedelta(days=7),
                last_seen=datetime.utcnow(),
                **ioc_data
            )
            db.add(ioc)
        
        db.commit()
        print(f"✅ Created {len(iocs)} IOCs")
        print("✅ MalGenX database seeded successfully!")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_malware_samples()
