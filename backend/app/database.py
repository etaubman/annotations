# ============================
# Database Configuration Module
# ============================

"""
This module sets up the database connection using SQLAlchemy.
It configures the engine, session maker, and declarative base for ORM models.
"""

# ============================
# Import Statements
# ============================

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# ============================
# Environment Configuration
# ============================

# Retrieve the database URL from environment variables.
# Defaults to a local SQLite database if not provided.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

# ============================
# Engine Configuration
# ============================

# Create the SQLAlchemy engine.
# The 'check_same_thread' argument is specific to SQLite and should be removed for other databases.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {},
    pool_pre_ping=True  # Ensures connections are valid before using them
)

# ============================
# Session Local Configuration
# ============================

# Create a configured "Session" class
SessionLocal = sessionmaker(
    autocommit=False,  # Disable autocommit to control transactions manually
    autoflush=False,    # Disable autoflush to prevent premature data flushing
    bind=engine         # Bind the sessionmaker to the engine
)

# ============================
# Declarative Base
# ============================

# Base class for declarative class definitions
Base = declarative_base()

# ============================
# Dependency: Database Session
# ============================

def get_db():
    """
    Provides a database session to be used in API endpoints.

    Yields:
        Session: An SQLAlchemy session instance.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================
# Additional Configuration (Optional)
# ============================

# If you're planning to use Alembic for migrations, ensure that your models are correctly imported here
# to be recognized by Alembic's autogenerate feature.

# Example:
# from . import models  # Ensure models are imported so that Alembic can detect them

# ============================
# Usage Example
# ============================

# In your main application file (e.g., main.py), you can import the `engine` and `Base` to create tables:
# from .database import engine, Base
# from . import models
# 
# Base.metadata.create_all(bind=engine)

