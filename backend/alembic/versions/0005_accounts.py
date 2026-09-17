"""User accounts, sessions, email tokens and the log of what each user looked at

Revision ID: 0005_accounts
Revises: 0004_email_suppressions
Create Date: 2026-09-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0005_accounts'
down_revision: Union[str, None] = '0004_email_suppressions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(length=320), nullable=False),  # always stored lower-case
    sa.Column('name', sa.String(length=100), nullable=True),
    sa.Column('password_hash', sa.Text(), nullable=False),
    sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('disabled_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email'),
    )
    op.create_table('user_sessions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('ip', sa.String(length=45), nullable=True),
    sa.Column('user_agent', sa.String(length=255), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('token_hash'),
    )
    op.create_index('user_sessions_user_id_idx', 'user_sessions', ['user_id'])
    op.create_table('email_tokens',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
    sa.Column('kind', sa.String(length=20), nullable=False),  # verify, reset
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('token_hash'),
    )
    op.create_index('email_tokens_user_id_idx', 'email_tokens', ['user_id'])
    # What a signed-in user looked at: company profiles, person pages and person-name searches.
    # Kept for a year (see accounts.purge_old_records) and shown to the user on their account page.
    op.create_table('company_views',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
    sa.Column('kind', sa.String(length=20), nullable=False),  # profile, person, person_search
    sa.Column('subject', sa.String(length=200), nullable=False),  # NZBN, person slug or the search text
    sa.Column('label', sa.String(length=200), nullable=True),  # what to show: company or person name
    sa.Column('viewed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('company_views_user_viewed_idx', 'company_views', ['user_id', sa.text('viewed_at DESC')])


def downgrade() -> None:
    op.drop_table('company_views')
    op.drop_table('email_tokens')
    op.drop_table('user_sessions')
    op.drop_table('users')
