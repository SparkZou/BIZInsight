"""Contact details from NZBN primary business data, and the jobs that fetch them

Revision ID: 0003_company_contact_details
Revises: 0002_import_jobs
Create Date: 2026-09-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0003_company_contact_details'
down_revision: Union[str, None] = '0002_import_jobs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('company_contact_details',
    sa.Column('nzbn', sa.String(length=20), nullable=False),
    sa.Column('company_number', sa.String(length=20), nullable=True),
    sa.Column('source', sa.String(length=40), nullable=False),
    sa.Column('details', postgresql.JSONB(), nullable=True),
    sa.Column('phones', sa.Text(), server_default='', nullable=False),
    sa.Column('emails', sa.Text(), server_default='', nullable=False),
    sa.Column('websites', sa.Text(), server_default='', nullable=False),
    sa.Column('trading_names', sa.Text(), server_default='', nullable=False),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('fetched_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('nzbn')
    )
    op.create_table('enrichment_jobs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('month', sa.String(length=7), nullable=False),
    sa.Column('source', sa.String(length=40), nullable=False),
    sa.Column('created_by', sa.String(length=100), nullable=False),
    sa.Column('total', sa.Integer(), server_default='0', nullable=False),
    sa.Column('done', sa.Integer(), server_default='0', nullable=False),
    sa.Column('found', sa.Integer(), server_default='0', nullable=False),
    sa.Column('failed', sa.Integer(), server_default='0', nullable=False),
    sa.Column('log', sa.Text(), server_default='', nullable=False),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('enrichment_jobs')
    op.drop_table('company_contact_details')
