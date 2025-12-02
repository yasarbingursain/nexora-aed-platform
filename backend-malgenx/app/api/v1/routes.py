from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.core.config import get_settings
from app.db.session import get_db
from app.db.models import MalwareSample

router = APIRouter()
settings = get_settings()


class SubmitSampleRequest(BaseModel):
    type: str = Field(..., pattern="^(file|url)$")
    url: Optional[str] = None
    file_id: Optional[str] = Field(None, alias="fileId")
    source: Optional[str] = None
    tags: Optional[List[str]] = None
    priority: str = Field("normal", pattern="^(low|normal|high|critical)$")


class SubmitSampleResponse(BaseModel):
    success: bool
    sample_id: str = Field(..., alias="sampleId")
    status: str


class GenericNotImplementedResponse(BaseModel):
    success: bool = False
    code: str
    message: str


@router.post("/samples/submit", response_model=SubmitSampleResponse, status_code=status.HTTP_202_ACCEPTED)
async def submit_sample(request: SubmitSampleRequest, db: Session = Depends(get_db)):
    """
    Submit a malware sample for analysis.
    Currently stores metadata and queues for future analysis.
    """
    # Create sample record
    sample = MalwareSample(
        id=uuid.uuid4(),
        organization_id="default",  # TODO: Extract from auth token
        submission_type=request.type,
        url=request.url if request.type == "url" else None,
        file_hash_sha256=request.file_id if request.type == "file" else None,  # Simplified for now
        source=request.source,
        tags=request.tags,
        priority=request.priority,
        status="queued",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    db.add(sample)
    db.commit()
    db.refresh(sample)
    
    # TODO: Enqueue to Celery for actual analysis
    # celery_app.send_task('analyze_sample', args=[str(sample.id)])
    
    return SubmitSampleResponse(
        success=True,
        sampleId=str(sample.id),
        status="queued"
    )


class SampleStatusResponse(BaseModel):
    success: bool
    sample_id: str = Field(..., alias="sampleId")
    status: str
    submission_type: str = Field(..., alias="submissionType")
    priority: str
    created_at: str = Field(..., alias="createdAt")
    risk_score: Optional[float] = Field(None, alias="riskScore")
    malware_family: Optional[str] = Field(None, alias="malwareFamily")


@router.get("/samples/{sample_id}/status", response_model=SampleStatusResponse)
async def get_sample_status(sample_id: str, db: Session = Depends(get_db)):
    """
    Get the analysis status of a submitted sample.
    """
    try:
        sample_uuid = uuid.UUID(sample_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sample ID format"
        )
    
    sample = db.query(MalwareSample).filter(MalwareSample.id == sample_uuid).first()
    
    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample not found"
        )
    
    return SampleStatusResponse(
        success=True,
        sampleId=str(sample.id),
        status=sample.status,
        submissionType=sample.submission_type,
        priority=sample.priority,
        createdAt=sample.created_at.isoformat(),
        riskScore=float(sample.risk_score) if sample.risk_score else None,
        malwareFamily=sample.malware_family
    )


class SampleReportResponse(BaseModel):
    success: bool
    sample_id: str = Field(..., alias="sampleId")
    status: str
    risk_score: Optional[float] = Field(None, alias="riskScore")
    malware_family: Optional[str] = Field(None, alias="malwareFamily")
    malware_category: Optional[str] = Field(None, alias="malwareCategory")
    is_malicious: Optional[bool] = Field(None, alias="isMalicious")
    mitre_tactics: Optional[List[str]] = Field(None, alias="mitreTactics")
    mitre_techniques: Optional[List[str]] = Field(None, alias="mitreTechniques")
    analysis_results: Optional[dict] = Field(None, alias="analysisResults")
    iocs_extracted: Optional[int] = Field(None, alias="iocsExtracted")


@router.get("/samples/{sample_id}/report", response_model=SampleReportResponse)
async def get_sample_report(sample_id: str, db: Session = Depends(get_db)):
    """
    Get detailed analysis report for a sample.
    """
    try:
        sample_uuid = uuid.UUID(sample_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sample ID format"
        )
    
    sample = db.query(MalwareSample).filter(MalwareSample.id == sample_uuid).first()
    
    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample not found"
        )
    
    # Count IOCs extracted for this sample
    from app.db.models import MalwareIOC
    iocs_count = db.query(MalwareIOC).filter(MalwareIOC.sample_id == sample_uuid).count()
    
    return SampleReportResponse(
        success=True,
        sampleId=str(sample.id),
        status=sample.status,
        riskScore=float(sample.risk_score) if sample.risk_score else None,
        malwareFamily=sample.malware_family,
        malwareCategory=sample.malware_category,
        isMalicious=sample.is_malicious,
        mitreTactics=sample.mitre_tactics,
        mitreTechniques=sample.mitre_techniques,
        analysisResults=None,  # TODO: Query malware_analysis_results table
        iocsExtracted=iocs_count
    )


class IocSearchRequest(BaseModel):
    query: str
    type: Optional[str] = None
    severity: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    limit: Optional[int] = Field(100, ge=1, le=1000)
    offset: Optional[int] = Field(0, ge=0)


class IOCResult(BaseModel):
    id: str
    ioc_type: str = Field(..., alias="iocType")
    ioc_value: str = Field(..., alias="iocValue")
    sample_id: str = Field(..., alias="sampleId")
    is_validated: bool = Field(..., alias="isValidated")
    is_known_malicious: Optional[bool] = Field(None, alias="isKnownMalicious")
    reputation_score: Optional[float] = Field(None, alias="reputationScore")
    first_seen: str = Field(..., alias="firstSeen")
    last_seen: str = Field(..., alias="lastSeen")


class IOCSearchResponse(BaseModel):
    success: bool
    total: int
    results: List[IOCResult]


@router.post("/iocs/search", response_model=IOCSearchResponse)
async def search_iocs(request: IocSearchRequest, db: Session = Depends(get_db)):
    """
    Search for IOCs in the malware database.
    """
    from app.db.models import MalwareIOC
    from sqlalchemy import or_, func
    
    query = db.query(MalwareIOC)
    
    # Search by value (fuzzy match)
    if request.query:
        query = query.filter(
            or_(
                MalwareIOC.ioc_value.ilike(f"%{request.query}%"),
                func.similarity(MalwareIOC.ioc_value, request.query) > 0.3
            )
        )
    
    # Filter by type
    if request.type:
        query = query.filter(MalwareIOC.ioc_type == request.type)
    
    # Filter by known malicious
    if request.severity:
        # Map severity to reputation score ranges
        if request.severity == "critical":
            query = query.filter(MalwareIOC.reputation_score >= 0.8)
        elif request.severity == "high":
            query = query.filter(MalwareIOC.reputation_score >= 0.6)
        elif request.severity == "medium":
            query = query.filter(MalwareIOC.reputation_score >= 0.4)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    results = query.offset(request.offset).limit(request.limit).all()
    
    return IOCSearchResponse(
        success=True,
        total=total,
        results=[
            IOCResult(
                id=str(ioc.id),
                iocType=ioc.ioc_type,
                iocValue=ioc.ioc_value,
                sampleId=str(ioc.sample_id),
                isValidated=ioc.is_validated,
                isKnownMalicious=ioc.is_known_malicious,
                reputationScore=float(ioc.reputation_score) if ioc.reputation_score else None,
                firstSeen=ioc.first_seen.isoformat(),
                lastSeen=ioc.last_seen.isoformat()
            )
            for ioc in results
        ]
    )


class ThreatFeedItem(BaseModel):
    sample_id: str = Field(..., alias="sampleId")
    submission_type: str = Field(..., alias="submissionType")
    malware_family: Optional[str] = Field(None, alias="malwareFamily")
    risk_score: Optional[float] = Field(None, alias="riskScore")
    risk_level: Optional[str] = Field(None, alias="riskLevel")
    is_malicious: Optional[bool] = Field(None, alias="isMalicious")
    created_at: str = Field(..., alias="createdAt")


class ThreatsFeedResponse(BaseModel):
    success: bool
    total: int
    threats: List[ThreatFeedItem]


@router.get("/threats/feed", response_model=ThreatsFeedResponse)
async def threats_feed(
    sinceMinutes: Optional[int] = None,
    severity: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get real-time malware threats feed.
    """
    query = db.query(MalwareSample).filter(
        MalwareSample.is_malicious == True
    )
    
    # Filter by time window
    if sinceMinutes:
        from datetime import datetime, timedelta
        cutoff_time = datetime.utcnow() - timedelta(minutes=sinceMinutes)
        query = query.filter(MalwareSample.created_at >= cutoff_time)
    
    # Filter by severity (risk level)
    if severity:
        query = query.filter(MalwareSample.risk_level == severity)
    
    # Order by most recent and limit
    threats = query.order_by(MalwareSample.created_at.desc()).limit(limit).all()
    
    return ThreatsFeedResponse(
        success=True,
        total=len(threats),
        threats=[
            ThreatFeedItem(
                sampleId=str(threat.id),
                submissionType=threat.submission_type,
                malwareFamily=threat.malware_family,
                riskScore=float(threat.risk_score) if threat.risk_score else None,
                riskLevel=threat.risk_level,
                isMalicious=threat.is_malicious,
                createdAt=threat.created_at.isoformat()
            )
            for threat in threats
        ]
    )
