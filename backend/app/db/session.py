from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    # The API is read-heavy and runs many optional lookups per request. In PostgreSQL a
    # failed statement aborts the surrounding transaction, so autocommit keeps one
    # missing table from breaking every later query in the same request.
    isolation_level="AUTOCOMMIT",
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
