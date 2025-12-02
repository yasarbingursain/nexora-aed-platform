#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Evidence Collection Automation (SQLite version)
Collects compliance evidence from SQLite database
"""

import os
import sys
import json
import sqlite3
import datetime
import statistics
from typing import Dict, Any, List
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

DATABASE_PATH = os.getenv("DATABASE_PATH", "./prisma/dev.db")
EVIDENCE_BUCKET = os.getenv("EVIDENCE_BUCKET", "./artifacts/evidence")

def get_conn():
    """Get database connection"""
    return sqlite3.connect(DATABASE_PATH)

def export_detection_logs(days: int = 90) -> List[Dict[str, Any]]:
    """Export detection logs for compliance evidence"""
    conn = get_conn()
    cur = conn.cursor()
    
    # SQLite date calculation
    date_threshold = (datetime.datetime.now() - datetime.timedelta(days=days)).isoformat()
    
    cur.execute("""
        SELECT id, mitreId, severity, category, createdAt, status, resolvedAt
        FROM threats
        WHERE createdAt > ?
        ORDER BY createdAt DESC
    """, (date_threshold,))
    
    rows = cur.fetchall()
    conn.close()
    
    out = []
    for r in rows:
        out.append({
            "threat_id": r[0],
            "rule_id": r[1],
            "severity": r[2],
            "score": float(r[3]) if r[3] is not None else None,
            "detected_at": r[4],
            "status": r[5],
            "remediated_at": r[6],
        })
    return out

def calculate_mttr() -> Dict[str, Any]:
    """Calculate Mean Time To Remediate (MTTR) metrics"""
    conn = get_conn()
    cur = conn.cursor()
    
    date_threshold = (datetime.datetime.now() - datetime.timedelta(days=90)).isoformat()
    
    cur.execute("""
        SELECT createdAt, resolvedAt
        FROM threats
        WHERE resolvedAt IS NOT NULL
          AND createdAt > ?
    """, (date_threshold,))
    
    rows = cur.fetchall()
    conn.close()
    
    if not rows:
        return {
            "mean_seconds": None,
            "median_seconds": None,
            "p95_seconds": None,
            "meets_slo": False,
            "sample_size": 0
        }
    
    # Calculate time differences
    vals = []
    for detected, remediated in rows:
        if detected and remediated:
            detected_dt = datetime.datetime.fromisoformat(detected)
            remediated_dt = datetime.datetime.fromisoformat(remediated)
            diff = (remediated_dt - detected_dt).total_seconds()
            vals.append(diff)
    
    if not vals:
        return {
            "mean_seconds": None,
            "median_seconds": None,
            "p95_seconds": None,
            "meets_slo": False,
            "sample_size": 0
        }
    
    vals_sorted = sorted(vals)
    p95_idx = int(0.95 * len(vals_sorted)) - 1
    median = statistics.median(vals)
    
    return {
        "mean_seconds": statistics.fmean(vals),
        "median_seconds": median,
        "p95_seconds": vals_sorted[p95_idx] if p95_idx >= 0 else None,
        "meets_slo": median < 3.0,
        "sample_size": len(vals)
    }

def calculate_detection_precision() -> Dict[str, Any]:
    """Calculate detection precision (1 - false positive rate)"""
    conn = get_conn()
    cur = conn.cursor()
    
    date_threshold = (datetime.datetime.now() - datetime.timedelta(days=90)).isoformat()
    
    cur.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status != 'false_positive' THEN 1 ELSE 0 END) as true_positives,
            SUM(CASE WHEN status = 'false_positive' THEN 1 ELSE 0 END) as false_positives
        FROM threats
        WHERE createdAt > ?
    """, (date_threshold,))
    
    row = cur.fetchone()
    conn.close()
    
    total, tp, fp = row[0], row[1], row[2]
    
    if total == 0:
        return {"precision": None, "false_positive_rate": None, "meets_target": False}
    
    precision = tp / total
    fp_rate = fp / total
    
    return {
        "precision": precision,
        "false_positive_rate": fp_rate,
        "meets_target": fp_rate < 0.05,
        "total_detections": total,
        "true_positives": tp,
        "false_positives": fp
    }

def get_uptime() -> Dict[str, Any]:
    """Get system uptime metrics"""
    conn = get_conn()
    cur = conn.cursor()
    
    # Check if table exists
    cur.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='system_uptime_metrics'
    """)
    
    if not cur.fetchone():
        conn.close()
        return {"uptime_30d": None, "meets_slo": False, "slo_target": 0.999}
    
    date_threshold = (datetime.datetime.now() - datetime.timedelta(days=30)).isoformat()
    
    cur.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_count
        FROM system_uptime_metrics
        WHERE timestamp > ?
    """, (date_threshold,))
    
    row = cur.fetchone()
    conn.close()
    
    if not row or row[0] == 0:
        return {"uptime_30d": None, "meets_slo": False, "slo_target": 0.999}
    
    total, up_count = row[0], row[1]
    uptime = up_count / total if total > 0 else 0
    
    return {
        "uptime_30d": uptime,
        "meets_slo": uptime >= 0.999,
        "slo_target": 0.999
    }

def collect_soc2_cc61() -> Dict[str, Any]:
    """Collect evidence for SOC2 CC6.1 (Access Controls)"""
    return {
        "detection_logs": export_detection_logs(90),
        "remediation_times": calculate_mttr(),
        "detection_precision": calculate_detection_precision(),
        "uptime": get_uptime()
    }

def write_json(path: str, data: Any):
    """Write JSON data to file"""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding='utf-8') as f:
        json.dump(data, f, indent=2, default=str)

def run():
    """Main evidence collection routine"""
    timestamp = datetime.datetime.utcnow()
    
    print("🔍 Collecting compliance evidence...")
    print(f"📁 Database: {DATABASE_PATH}")
    print(f"📦 Output: {EVIDENCE_BUCKET}")
    print("")
    
    bundle = {
        "generated_at": timestamp.isoformat() + "Z",
        "period_days": 90,
        "controls": {
            "SOC2.CC6.1": collect_soc2_cc61(),
        },
        "summary": {
            "total_detections": len(export_detection_logs(90)),
            "mttr_meets_slo": calculate_mttr().get("meets_slo", False),
            "uptime_meets_slo": get_uptime().get("meets_slo", False),
            "precision_meets_target": calculate_detection_precision().get("meets_target", False)
        }
    }
    
    # Write to evidence bucket
    date_str = timestamp.strftime("%Y-%m-%d")
    out_path = f"{EVIDENCE_BUCKET}/evidence_{date_str}.json"
    write_json(out_path, bundle)
    
    print("✅ Evidence collected successfully")
    print(f"📁 Output: {out_path}")
    print(f"📊 Summary:")
    print(f"   - Total detections: {bundle['summary']['total_detections']}")
    print(f"   - MTTR SLO: {'✅ PASS' if bundle['summary']['mttr_meets_slo'] else '❌ FAIL'}")
    print(f"   - Uptime SLO: {'✅ PASS' if bundle['summary']['uptime_meets_slo'] else '❌ FAIL'}")
    print(f"   - Precision: {'✅ PASS' if bundle['summary']['precision_meets_target'] else '❌ FAIL'}")

if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
