from sqlalchemy import Column, Integer, BigInteger, String, Text, DateTime
from sqlalchemy.sql import func
from app.models.company import Base

class ImportJob(Base):
    """A bulk data import started from the /admin page."""
    __tablename__ = "import_jobs"

    id = Column(Integer, primary_key=True)
    status = Column(String(20), nullable=False)  # queued, running, succeeded, failed
    created_by = Column(String(100), nullable=False)
    source_files = Column(Text, nullable=False)  # uploaded file names, comma-separated
    files_total = Column(Integer, nullable=False, default=0)
    files_done = Column(Integer, nullable=False, default=0)
    rows_imported = Column(BigInteger, nullable=False, default=0)
    log = Column(Text, nullable=False, default="")
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
