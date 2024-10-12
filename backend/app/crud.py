# ============================
# CRUD Operations Module
# ============================

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List, Optional

# Local Imports
from . import models, schemas
from .models import Document, Annotation


# ============================
# Document CRUD Operations
# ============================

def get_document(db: Session, document_id: int) -> Optional[Document]:
    """
    Retrieve a single document by its ID.

    Args:
        db (Session): The database session.
        document_id (int): The ID of the document to retrieve.

    Returns:
        Optional[Document]: The document if found, else None.
    """
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    return document


def get_documents(db: Session, skip: int = 0, limit: int = 100) -> List[Document]:
    """
    Retrieve a list of documents with pagination.

    Args:
        db (Session): The database session.
        skip (int, optional): Number of records to skip. Defaults to 0.
        limit (int, optional): Maximum number of records to return. Defaults to 100.

    Returns:
        List[Document]: A list of documents.
    """
    documents = db.query(models.Document).offset(skip).limit(limit).all()
    return documents


def create_document(db: Session, file_path: str) -> Document:
    """
    Create a new document entry in the database.

    Args:
        db (Session): The database session.
        file_path (str): The file path of the uploaded document.

    Returns:
        Document: The created document instance.
    """
    db_document = models.Document(file_path=file_path)
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document


def create_or_update_document(db: Session, file_path: str) -> Document:
    """
    Create a new document or update the upload timestamp if it already exists.

    Args:
        db (Session): The database session.
        file_path (str): The file path of the uploaded document.

    Returns:
        Document: The created or updated document instance.
    """
    # Attempt to retrieve the document by its file path
    document = db.query(models.Document).filter(models.Document.file_path == file_path).first()
    
    if document:
        # Document exists; update the 'uploaded_at' timestamp
        document.uploaded_at = datetime.utcnow()
        db.commit()
        db.refresh(document)  # Refresh to get the latest state
        return document
    else:
        # Document does not exist; create a new entry
        db_document = models.Document(file_path=file_path)
        db.add(db_document)
        db.commit()
        db.refresh(db_document)  # Refresh to get the generated ID and other fields
        return db_document


# ============================
# Annotation CRUD Operations
# ============================

def create_annotation(db: Session, annotation: schemas.AnnotationCreate) -> Annotation:
    """
    Create a new annotation for a document.

    Args:
        db (Session): The database session.
        annotation (schemas.AnnotationCreate): The annotation data.

    Returns:
        Annotation: The created annotation instance.
    """
    db_annotation = models.Annotation(
        document_id=annotation.document_id,
        page=annotation.page,  # Page number where the annotation is located
        x=annotation.x,        # X-coordinate of the annotation
        y=annotation.y,        # Y-coordinate of the annotation
        width=annotation.width,        # Width of the annotation area
        height=annotation.height,      # Height of the annotation area
        value=annotation.value,        # Annotation title or name
        annotation_value=annotation.annotation_value  # Additional annotation details
    )
    db.add(db_annotation)
    db.commit()
    db.refresh(db_annotation)
    return db_annotation


def get_annotations_by_document(db: Session, document_id: int) -> List[Annotation]:
    """
    Retrieve all annotations associated with a specific document.

    Args:
        db (Session): The database session.
        document_id (int): The ID of the document.

    Returns:
        List[Annotation]: A list of annotations for the document.
    """
    annotations = db.query(models.Annotation).filter(models.Annotation.document_id == document_id).all()
    return annotations


# ============================
# Combined Query Operations
# ============================

def get_documents_with_annotation_count(db: Session) -> List[schemas.DocumentWithAnnotationsCount]:
    """
    Retrieve all documents along with the count of annotations associated with each.

    Args:
        db (Session): The database session.

    Returns:
        List[schemas.DocumentWithAnnotationsCount]: A list of documents with their annotation counts.
    """
    # Perform a left outer join between Document and Annotation, grouping by Document.id
    results = db.query(
        Document.id,
        Document.file_path,
        Document.uploaded_at,
        func.count(Annotation.id).label('annotation_count')
    ).outerjoin(Annotation).group_by(Document.id).all()

    # Convert the results into the desired schema format
    documents_with_counts = [
        schemas.DocumentWithAnnotationsCount(
            id=doc.id,
            file_path=doc.file_path,
            uploaded_at=doc.uploaded_at,
            annotation_count=doc.annotation_count
        )
        for doc in results
    ]

    return documents_with_counts
