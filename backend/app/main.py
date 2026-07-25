"""
FastAPI entry point. Creates the app, configures CORS so the Vercel frontend
can call it, seeds the database on startup, and mounts the routers.
Run locally:  uvicorn app.main:app --reload
Then open:    http://127.0.0.1:8000/docs
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import models BEFORE create_db_and_tables so SQLModel knows the tables.
from app import models  # noqa: F401  (registers the FieldModel table)
from app.database import create_db_and_tables
from app.seed import seed
from app.routers import returns, fields, upload

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables, then seed if empty.
    create_db_and_tables()
    seed()
    yield
    # (nothing to clean up on shutdown for SQLite)


app = FastAPI(
    title="CPA Trace API",
    description="Backend for the CPA Trace return-review console. "
                "Serves fields with full provenance, enforces the review "
                "state machine, and keeps an append-only audit trail.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the frontend origin(s) to call this API.
# In prod, set FRONTEND_ORIGIN to your Vercel URL via Render env vars.
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
allowed = [frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(allowed)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers.
app.include_router(returns.router)
app.include_router(fields.router)
app.include_router(upload.router)


@app.get("/")
def root():
    return {"service": "CPA Trace API", "status": "ok", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}
