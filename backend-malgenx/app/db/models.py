from sqlalchemy import Column, String, Integer, Float, Boolean, TIMESTAMP, Text, ARRAY, JSON, BigInteger, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class MalwareSample(Base):
    __tablename__ = "malware_samples"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organization_id = Column(Text, nullable=False)
    
    # Sample Identity
    submission_type = Column(Text, nullable=False)
    file_hash_sha256 = Column(Text)
    file_hash_md5 = Column(Text)
    file_hash_sha1 = Column(Text)
    file_name = Column(Text)
    file_size_bytes = Column(BigInteger)
    file_mime_type = Column(Text)
    url = Column(Text)
    
    # Submission Metadata
    source = Column(Text)
    tags = Column(ARRAY(Text))
    priority = Column(Text, nullable=False, server_default="normal")
    submitted_by = Column(Text)
    
    # Analysis Status
    status = Column(Text, nullable=False, server_default="queued")
    analysis_started_at = Column(TIMESTAMP(timezone=True))
    analysis_completed_at = Column(TIMESTAMP(timezone=True))
    analysis_duration_ms = Column(Integer)
    
    # OCSF Classification
    category_uid = Column(Integer, nullable=False, server_default="4")
    category_name = Column(Text, nullable=False, server_default="Security Finding")
    class_uid = Column(Integer, nullable=False, server_default="4001")
    class_name = Column(Text, nullable=False, server_default="Malware Finding")
    type_uid = Column(Integer, nullable=False, server_default="400101")
    type_name = Column(Text, nullable=False, server_default="Malware Sample Analysis")
    
    # Risk Assessment
    risk_score = Column(Float)
    risk_level = Column(Text)
    confidence_score = Column(Float)
    
    # Malware Classification
    malware_family = Column(Text)
    malware_category = Column(Text)
    is_malicious = Column(Boolean)
    false_positive = Column(Boolean, server_default="false")
    
    # MITRE ATT&CK
    mitre_tactics = Column(ARRAY(Text))
    mitre_techniques = Column(ARRAY(Text))
    
    # Storage & Retention
    storage_location = Column(Text)
    retention_policy = Column(Text, server_default="standard")
    expires_at = Column(TIMESTAMP(timezone=True))
    
    # Audit Fields
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(TIMESTAMP(timezone=True))


class MalwareIOC(Base):
    __tablename__ = "malware_iocs"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    sample_id = Column(UUID(as_uuid=True), nullable=False)
    
    # IOC Identity
    ioc_type = Column(Text, nullable=False)
    ioc_value = Column(Text, nullable=False)
    
    # Context
    extraction_method = Column(Text, nullable=False)
    context = Column(Text)
    
    # Validation
    is_validated = Column(Boolean, server_default="false")
    validation_method = Column(Text)
    
    # Threat Intel Enrichment
    threat_intel_sources = Column(ARRAY(Text))
    reputation_score = Column(Float)
    is_known_malicious = Column(Boolean)
    
    # Geolocation
    country_code = Column(Text)
    country_name = Column(Text)
    asn = Column(Text)
    asn_org = Column(Text)
    
    # Temporal
    first_seen = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    last_seen = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    
    # Audit Fields
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
