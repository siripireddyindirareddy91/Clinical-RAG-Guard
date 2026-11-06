"""Normalized storage. Local SQLite; PostgreSQL via DATABASE_URL in production."""
import os, uuid
from datetime import datetime, timezone
from sqlalchemy import create_engine, String, Text, Float, ForeignKey, JSON, Integer, event
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

def uid(): return str(uuid.uuid4())
def now(): return datetime.now(timezone.utc).isoformat()
class Base(DeclarativeBase): pass
class User(Base):
    __tablename__ = 'users'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, default='researcher')
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[str] = mapped_column(String, default=now)
class Document(Base):
    __tablename__ = 'documents'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    title: Mapped[str] = mapped_column(String)
    filename: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String, default='Clinical Research')
    source: Mapped[str] = mapped_column(String, default='User upload')
    author: Mapped[str] = mapped_column(String, default='')
    publication_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(Text, default='')
    processing_status: Mapped[str] = mapped_column(String, default='Indexed')
    synthetic: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[str] = mapped_column(String, default=now)
class Chunk(Base):
    __tablename__ = 'document_chunks'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    document_id: Mapped[str] = mapped_column(ForeignKey('documents.id', ondelete='CASCADE'), index=True)
    chunk_text: Mapped[str] = mapped_column(Text)
    page_number: Mapped[int] = mapped_column(Integer)
    embedding: Mapped[list] = mapped_column(JSON, default=list)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
class Query(Base):
    __tablename__ = 'clinical_queries'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    question: Mapped[str] = mapped_column(Text)
    generated_answer: Mapped[str] = mapped_column(Text)
    corrected_answer: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String)
    result: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[str] = mapped_column(String, default=now)
class Claim(Base):
    __tablename__ = 'claims'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    query_id: Mapped[str] = mapped_column(ForeignKey('clinical_queries.id', ondelete='CASCADE'), index=True)
    claim_text: Mapped[str] = mapped_column(Text)
    verification_status: Mapped[str] = mapped_column(String)
    confidence_score: Mapped[float] = mapped_column(Float)
    explanation: Mapped[str] = mapped_column(Text)
class Evidence(Base):
    __tablename__ = 'evidence'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    claim_id: Mapped[str] = mapped_column(ForeignKey('claims.id', ondelete='CASCADE'), index=True)
    document_id: Mapped[str] = mapped_column(String)
    chunk_id: Mapped[str] = mapped_column(String)
    page_number: Mapped[int] = mapped_column(Integer)
    relevance_score: Mapped[float] = mapped_column(Float)
    evidence_type: Mapped[str] = mapped_column(String)
class Correction(Base):
    __tablename__ = 'correction_history'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    query_id: Mapped[str] = mapped_column(ForeignKey('clinical_queries.id', ondelete='CASCADE'), index=True)
    iteration: Mapped[int] = mapped_column(Integer)
    original_text: Mapped[str] = mapped_column(Text)
    corrected_text: Mapped[str] = mapped_column(Text)
    correction_reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String, default=now)
class Execution(Base):
    __tablename__ = 'agent_executions'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    query_id: Mapped[str] = mapped_column(ForeignKey('clinical_queries.id', ondelete='CASCADE'), index=True)
    agent_name: Mapped[str] = mapped_column(String)
    execution_status: Mapped[str] = mapped_column(String)
    execution_time: Mapped[float] = mapped_column(Float)
    output_summary: Mapped[str] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String, default=now)
class Audit(Base):
    __tablename__ = 'audit_logs'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    action: Mapped[str] = mapped_column(String)
    resource_type: Mapped[str] = mapped_column(String)
    resource_id: Mapped[str] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String, default=now)

URL = os.getenv('DATABASE_URL') or ('sqlite:////tmp/mediverify.db' if os.getenv('VERCEL') else 'sqlite:///./mediverify.db')
if URL.startswith('postgres://'): URL = URL.replace('postgres://', 'postgresql+psycopg://', 1)
if URL.startswith('postgresql://'): URL = URL.replace('postgresql://', 'postgresql+psycopg://', 1)
engine = create_engine(URL, **({'connect_args': {'check_same_thread': False}} if URL.startswith('sqlite') else {'pool_pre_ping': True}))
if URL.startswith('sqlite'):
    @event.listens_for(engine, 'connect')
    def fk(conn, _): conn.execute('PRAGMA foreign_keys=ON')
Session = sessionmaker(engine, expire_on_commit=False)
def initialize(): Base.metadata.create_all(engine)
def record(db, user_id, action, resource_type, resource_id=''):
    db.add(Audit(user_id=user_id, action=action, resource_type=resource_type, resource_id=resource_id))
