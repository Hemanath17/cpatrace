"""
Database plumbing — engine + session management, isolated on purpose.
If you ever swap SQLite for Postgres, THIS is the only file that changes
(just the DATABASE_URL). Everything else is DB-agnostic via SQLModel.
"""

import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cpatrace.db")

# check_same_thread=False is required for SQLite under FastAPI's threaded
# request handling. Harmless here; SQLite is right-sized for this data.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)


def create_db_and_tables() -> None:
    """Create all tables defined by SQLModel models. Called once at startup."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency — yields a session per request, closes it after."""
    with Session(engine) as session:
        yield session
