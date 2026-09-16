"""Email addresses that must never be contacted again

Revision ID: 0004_email_suppressions
Revises: 0003_company_contact_details
Create Date: 2026-09-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0004_email_suppressions'
down_revision: Union[str, None] = '0003_company_contact_details'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('email_suppressions',
    sa.Column('email', sa.String(length=320), nullable=False),  # always stored lower-case
    sa.Column('reason', sa.String(length=40), server_default='unsubscribe', nullable=False),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('created_by', sa.String(length=100), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('email')
    )


def downgrade() -> None:
    op.drop_table('email_suppressions')
