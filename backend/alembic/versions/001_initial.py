"""Initial normalized schema. Revision: 001."""
from alembic import op
from database import Base
revision='001'
down_revision=None
branch_labels=None
depends_on=None
def upgrade(): Base.metadata.create_all(bind=op.get_bind())
def downgrade(): Base.metadata.drop_all(bind=op.get_bind())
