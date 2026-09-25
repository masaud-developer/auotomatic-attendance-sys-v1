import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.database.models import User, AuditLog
from app.schemas.settings import AuditLogResponse
from app.api.deps import get_current_admin

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Returns immutable system audit logs with pagination and action filtering.
    """
    query = db.query(AuditLog).order_by(desc(AuditLog.timestamp))

    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    logs = query.offset(skip).limit(limit).all()

    results = []
    for l in logs:
        details_dict = None
        if l.details_json:
            try:
                details_dict = json.loads(l.details_json)
            except Exception:
                details_dict = {"raw": l.details_json}

        results.append(AuditLogResponse(
            id=l.id,
            user_id=l.user_id,
            user_email=l.user_email,
            action=l.action,
            entity_type=l.entity_type,
            entity_id=l.entity_id,
            details=details_dict,
            ip_address=l.ip_address,
            timestamp=l.timestamp
        ))
    return results
