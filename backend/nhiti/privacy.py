#!/usr/bin/env python3
"""
NHITI Privacy Layer
Privacy-preserving threat intelligence sharing with k-anonymity and differential privacy

GDPR-compliant threat intelligence aggregation and sharing
"""

import numpy as np
import hashlib
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class ThreatIndicator:
    """Threat indicator with privacy metadata"""
    indicator_hash: str
    threat_category: str
    confidence: float
    observation_count: int
    contributing_orgs: int
    first_seen: datetime
    last_seen: datetime
    severity: str
    metadata: Dict[str, Any]

class NHITIPrivacy:
    """Privacy-preserving threat intelligence processor"""
    
    def __init__(self, k_threshold: int = 5, epsilon: float = 0.1):
        """
        Initialize privacy layer
        
        Args:
            k_threshold: Minimum organizations required for k-anonymity
            epsilon: Differential privacy epsilon parameter
        """
        self.k_threshold = k_threshold
        self.epsilon = epsilon
    
    def anonymize_ioc(self, ioc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Apply k-anonymity to indicator of compromise
        
        Only publish if k or more organizations have observed it.
        This prevents single-source attribution.
        
        Args:
            ioc: Raw indicator data
            
        Returns:
            Anonymized indicator or None if below k-threshold
        """
        contributing_orgs = ioc.get('contributing_orgs', 0)
        
        # K-anonymity check
        if contributing_orgs < self.k_threshold:
            return None
        
        # Hash the actual indicator value
        indicator_value = ioc.get('indicator_value', '')
        indicator_hash = hashlib.sha256(indicator_value.encode()).hexdigest()
        
        # Apply differential privacy noise to counts
        observation_count = ioc.get('observation_count', 0)
        noisy_count = self.add_dp_noise(observation_count)
        
        return {
            'indicator_hash': indicator_hash,
            'threat_category': ioc.get('threat_category'),
            'confidence': min(ioc.get('confidence', 0.5), 1.0),
            'observation_count': noisy_count,
            'contributing_orgs': contributing_orgs,  # Exact count OK after k-anonymity
            'severity': ioc.get('severity', 'medium'),
            'first_seen': ioc.get('first_seen'),
            'last_seen': ioc.get('last_seen'),
            'metadata': self._sanitize_metadata(ioc.get('metadata', {}))
        }
    
    def add_dp_noise(self, count: int) -> int:
        """
        Add Laplace noise for differential privacy
        
        Args:
            count: True count value
            
        Returns:
            Noisy count (non-negative)
        """
        # Laplace mechanism: noise ~ Lap(0, sensitivity/epsilon)
        # Sensitivity = 1 (adding/removing one record changes count by 1)
        sensitivity = 1
        scale = sensitivity / self.epsilon
        
        noise = np.random.laplace(0, scale)
        noisy_count = count + noise
        
        # Ensure non-negative
        return max(0, int(round(noisy_count)))
    
    def _sanitize_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Remove potentially identifying metadata
        
        Args:
            metadata: Raw metadata
            
        Returns:
            Sanitized metadata
        """
        # Allowlist of safe fields
        safe_fields = [
            'mitre_attack_id',
            'technique_name',
            'tactic',
            'platform',
            'data_source'
        ]
        
        return {
            k: v for k, v in metadata.items() 
            if k in safe_fields
        }
    
    def aggregate_indicators(
        self, 
        indicators: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Aggregate and anonymize multiple indicators
        
        Args:
            indicators: List of raw indicators
            
        Returns:
            List of anonymized indicators meeting k-anonymity
        """
        # Group by indicator hash
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        
        for ioc in indicators:
            indicator_value = ioc.get('indicator_value', '')
            indicator_hash = hashlib.sha256(indicator_value.encode()).hexdigest()
            
            if indicator_hash not in grouped:
                grouped[indicator_hash] = []
            grouped[indicator_hash].append(ioc)
        
        # Aggregate and anonymize
        anonymized = []
        
        for indicator_hash, group in grouped.items():
            # Count unique organizations
            orgs = set(ioc.get('organization_id') for ioc in group)
            contributing_orgs = len(orgs)
            
            # Skip if below k-threshold
            if contributing_orgs < self.k_threshold:
                continue
            
            # Aggregate statistics
            total_observations = sum(ioc.get('observation_count', 1) for ioc in group)
            avg_confidence = np.mean([ioc.get('confidence', 0.5) for ioc in group])
            
            # Get time range
            timestamps = [ioc.get('timestamp') for ioc in group if ioc.get('timestamp')]
            first_seen = min(timestamps) if timestamps else None
            last_seen = max(timestamps) if timestamps else None
            
            # Most common severity
            severities = [ioc.get('severity', 'medium') for ioc in group]
            severity = max(set(severities), key=severities.count)
            
            # Most common category
            categories = [ioc.get('threat_category', 'unknown') for ioc in group]
            category = max(set(categories), key=categories.count)
            
            # Create aggregated indicator
            aggregated = {
                'indicator_hash': indicator_hash,
                'threat_category': category,
                'confidence': avg_confidence,
                'observation_count': total_observations,
                'contributing_orgs': contributing_orgs,
                'severity': severity,
                'first_seen': first_seen,
                'last_seen': last_seen,
                'metadata': {}
            }
            
            # Anonymize
            anon = self.anonymize_ioc(aggregated)
            if anon:
                anonymized.append(anon)
        
        return anonymized
    
    def validate_privacy(self, indicators: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate privacy guarantees
        
        Args:
            indicators: List of indicators to validate
            
        Returns:
            Validation report
        """
        total = len(indicators)
        
        # Check k-anonymity
        below_k = sum(
            1 for ioc in indicators 
            if ioc.get('contributing_orgs', 0) < self.k_threshold
        )
        
        # Check for PII leakage
        pii_fields = ['email', 'ip_address', 'user_id', 'organization_name']
        pii_leaks = []
        
        for ioc in indicators:
            metadata = ioc.get('metadata', {})
            for field in pii_fields:
                if field in metadata:
                    pii_leaks.append(field)
        
        return {
            'total_indicators': total,
            'k_anonymity_violations': below_k,
            'k_anonymity_compliant': total - below_k,
            'pii_leaks': list(set(pii_leaks)),
            'privacy_compliant': below_k == 0 and len(pii_leaks) == 0,
            'epsilon': self.epsilon,
            'k_threshold': self.k_threshold
        }

# Example usage
if __name__ == "__main__":
    # Initialize privacy layer
    privacy = NHITIPrivacy(k_threshold=5, epsilon=0.1)
    
    # Example indicators
    indicators = [
        {
            'indicator_value': 'malicious_token_abc123',
            'threat_category': 'credential_theft',
            'confidence': 0.95,
            'observation_count': 10,
            'organization_id': 'org1',
            'severity': 'high',
            'timestamp': datetime.utcnow(),
            'metadata': {'mitre_attack_id': 'T1078.004'}
        },
        {
            'indicator_value': 'malicious_token_abc123',
            'threat_category': 'credential_theft',
            'confidence': 0.92,
            'observation_count': 8,
            'organization_id': 'org2',
            'severity': 'high',
            'timestamp': datetime.utcnow(),
            'metadata': {'mitre_attack_id': 'T1078.004'}
        },
        # ... more from different orgs
    ]
    
    # Aggregate and anonymize
    anonymized = privacy.aggregate_indicators(indicators)
    
    # Validate privacy
    report = privacy.validate_privacy(anonymized)
    
    print("Privacy Report:")
    print(f"  Total indicators: {report['total_indicators']}")
    print(f"  K-anonymity compliant: {report['k_anonymity_compliant']}")
    print(f"  Privacy compliant: {report['privacy_compliant']}")
