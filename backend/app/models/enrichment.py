from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.models.company import Base

class CompanyContactDetails(Base):
    """NZBN primary business data for a company (phones, emails, websites, ...) fetched from an outside source."""
    __tablename__ = "company_contact_details"

    nzbn = Column(String(20), primary_key=True)
    company_number = Column(String(20), nullable=True)
    source = Column(String(40), nullable=False)  # companies_office_web, later nzbn_api
    details = Column(JSONB, nullable=True)  # every parsed field, as lists of strings
    # "; "-joined copies of the most used fields, for lists, CSV export and ad-hoc SQL
    phones = Column(Text, nullable=False, default="")
    emails = Column(Text, nullable=False, default="")
    websites = Column(Text, nullable=False, default="")
    trading_names = Column(Text, nullable=False, default="")
    error = Column(Text, nullable=True)  # set when the source couldn't be read for this company
    fetched_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class EnrichmentJob(Base):
    """A run that fetches contact details for one month's new companies."""
    __tablename__ = "enrichment_jobs"

    id = Column(Integer, primary_key=True)
    status = Column(String(20), nullable=False)  # queued, running, succeeded, stopped, failed
    month = Column(String(7), nullable=False)
    source = Column(String(40), nullable=False)
    created_by = Column(String(100), nullable=False)
    total = Column(Integer, nullable=False, default=0)
    done = Column(Integer, nullable=False, default=0)
    found = Column(Integer, nullable=False, default=0)
    failed = Column(Integer, nullable=False, default=0)
    log = Column(Text, nullable=False, default="")
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)


class EmailSuppression(Base):
    """
    An address that must never be emailed again - someone unsubscribed, or the mail bounced.
    It applies to the address itself, so it covers every company that lists it.
    """
    __tablename__ = "email_suppressions"

    email = Column(String(320), primary_key=True)  # always stored lower-case
    reason = Column(String(40), nullable=False, default="unsubscribe")
    note = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
