from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..services import audit, pdf_report
from .decisions import get_or_404

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/{decision_id}/pdf")
def report_pdf(decision_id: str, db: Session = Depends(get_db)):
    d = get_or_404(db, decision_id)
    audit.record(db, d.id, "api", "report_exported", "PDF explainability report generated.")
    db.commit()
    db.refresh(d)
    return Response(pdf_report.build(d), media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{d.id}-explainability-report.pdf"'})
