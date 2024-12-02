# ============================
# CRUD Operations Module
# ============================

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime
from typing import List, Optional

# Local Imports
from . import models, schemas
from .models import Document, Annotation, DocumentType, DataElement, document_data_elements


# ============================
# Document CRUD Operations
# ============================

def get_document(db: Session, document_id: int) -> Optional[Document]:
    """
    Retrieve a single document by its ID, including its document_type.
    """
    document = db.query(models.Document)\
        .options(joinedload(models.Document.document_type))\
        .filter(models.Document.id == document_id)\
        .first()

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


def create_or_update_document(db: Session, file_path: str, document_type_id: int) -> Document:
    """
    Create a new document or update the upload timestamp if it already exists.

    Args:
        db (Session): The database session.
        file_path (str): The file path of the uploaded document.
        document_type_id (int): The ID of the associated document type.

    Returns:
        Document: The created or updated document instance.
    """
    # Attempt to retrieve the document by its file path
    document = db.query(models.Document).filter(models.Document.file_path == file_path).first()
    
    if document:
        # Document exists; update the 'uploaded_at' timestamp
        document.uploaded_at = datetime.utcnow()
        # Update the document type if provided
        if document_type_id:
            document.document_type_id = document_type_id
        db.commit()
        db.refresh(document)  # Refresh to get the latest state
        return document
    else:
        # Document does not exist; create a new entry
        db_document = models.Document(file_path=file_path, document_type_id=document_type_id)
        db.add(db_document)
        db.commit()
        db.refresh(db_document)  # Refresh to get the generated ID and other fields
        return db_document


def create_document_type(db: Session, name: str, description: str = None) -> models.DocumentType:
    """
    Create a new DocumentType in the database.
    
    Args:
        db (Session): The database session.
        name (str): Name of the document type.
        description (str, optional): Description of the document type.
    
    Returns:
        models.DocumentType: The created DocumentType instance.
    """
    db_document_type = models.DocumentType(name=name, description=description)
    db.add(db_document_type)
    db.commit()
    db.refresh(db_document_type)
    return db_document_type

def get_document_types(db: Session, skip: int = 0, limit: int = 100) -> List[DocumentType]:
    """
    Retrieve a list of document types with pagination.

    Args:
        db (Session): The database session.
        skip (int, optional): Number of records to skip. Defaults to 0.
        limit (int, optional): Maximum number of records to return. Defaults to 100.

    Returns:
        List[DocumentType]: A list of document types.
    """
    document_types = db.query(models.DocumentType).offset(skip).limit(limit).all()
    
    # Fetch associated data elements for each document type
    for document_type in document_types:
        data_elements = db.query(models.DataElement).join(
            document_data_elements
        ).filter(
            document_data_elements.c.document_type_id == document_type.id
        ).all()
        document_type.data_elements = data_elements

    return document_types

def get_data_elements_for_document_type(db: Session, document_type_id: int) -> List[DataElement]:
    """
    Retrieve all data elements associated with a specific document type.

    Args:
        db (Session): The database session.
        document_type_id (int): The ID of the document type.

    Returns:
        List[DataElement]: A list of data elements for the document type.
    """
    data_elements = db.query(models.DataElement).join(
        document_data_elements
    ).filter(
        document_data_elements.c.document_type_id == document_type_id
    ).all()
    return data_elements

def create_data_element(db: Session, name: str, description: str = None) -> models.DataElement:
    """
    Create a new DataElement in the database.
    
    Args:
        db (Session): The database session.
        name (str): Name of the data element.
        description (str, optional): Description of the data element.
    
    Returns:
        models.DataElement: The created DataElement instance.
    """
    db_data_element = models.DataElement(name=name, description=description)
    db.add(db_data_element)
    db.commit()
    db.refresh(db_data_element)
    return db_data_element


def associate_data_element_with_document_type(
    db: Session,
    document_type_id: int,
    data_element_id: int,
    is_required: bool = False,
    allow_multiple: bool = False
) -> None:
    """
    Associate a DataElement with a DocumentType with specific constraints.
    
    Args:
        db (Session): The database session.
        document_type_id (int): The ID of the DocumentType.
        data_element_id (int): The ID of the DataElement.
        is_required (bool, optional): Whether the data element is required. Defaults to False.
        allow_multiple (bool, optional): Whether multiple instances are allowed. Defaults to False.
    """
    association = document_data_elements.insert().values(
        document_type_id=document_type_id,
        data_element_id=data_element_id,
        is_required=is_required,
        allow_multiple=allow_multiple
    )
    try:
        db.execute(association)
        db.commit()
        print(f"DataElement ID {data_element_id} associated with DocumentType ID {document_type_id}.")
    except Exception as e:
        db.rollback()
        print(f"Failed to associate DataElement ID {data_element_id} with DocumentType ID {document_type_id}: {e}")


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
