"""Add import_jobs for the /admin bulk data import

Revision ID: 0002_import_jobs
Revises: 0001_postgresql_baseline
Create Date: 2026-09-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0002_import_jobs'
down_revision: Union[str, None] = '0001_postgresql_baseline'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('import_jobs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('created_by', sa.String(length=100), nullable=False),
    sa.Column('source_files', sa.Text(), nullable=False),
    sa.Column('files_total', sa.Integer(), server_default='0', nullable=False),
    sa.Column('files_done', sa.Integer(), server_default='0', nullable=False),
    sa.Column('rows_imported', sa.BigInteger(), server_default='0', nullable=False),
    sa.Column('log', sa.Text(), server_default='', nullable=False),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('import_jobs')
