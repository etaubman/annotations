from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List  # Added List for handling collections

# Base schema for a document, containing the common fields
class DocumentBase(BaseModel):
    file_path: str  # Path to the uploaded document file

# Schema used when creating a new document, inheriting from DocumentBase
class DocumentCreate(DocumentBase):
    pass

# Schema for a document with the count of annotations associated with it
class DocumentWithAnnotationsCount(DocumentBase):
    id: int  # Unique identifier for the document
    uploaded_at: datetime  # Timestamp of when the document was uploaded
    annotation_count: int  # Count of annotations associated with the document

    # Enable ORM mode to allow mapping SQLAlchemy models to Pydantic models
    class Config:
        orm_mode = True

class DataElementBase(BaseModel):
    name: str
    description: Optional[str] = None

class DataElementCreate(DataElementBase):
    pass

class DataElement(DataElementBase):
    id: int

    class Config:
        orm_mode = True

class DocumentTypeBase(BaseModel):
    name: str
    data_elements: List[DataElement] = []  # Add relation to DataElements
    description: Optional[str] = None

class DocumentTypeCreate(DocumentTypeBase):
    pass

class DocumentType(DocumentTypeBase):
    id: int

    class Config:
        orm_mode = True

# Schema for a document that has been stored in the database
class Document(DocumentBase):
    id: int  # Unique identifier for the document
    uploaded_at: datetime  # Timestamp of when the document was uploaded
    document_type: Optional[DocumentType] = None  # Add relation to DocumentType
    created_by: Optional[str] = None  # User who uploaded the document, default is None

    # Enable ORM mode to allow mapping SQLAlchemy models to Pydantic models
    class Config:
        orm_mode = True

# Base schema for an annotation, containing the common fields
class AnnotationBase(BaseModel):
    document_id: int  # Reference to the associated document
    page: int  # Page number where the annotation is placed
    x: float  # X coordinate of the annotation
    y: float  # Y coordinate of the annotation
    width: float  # Width of the annotation area
    height: float  # Height of the annotation area
    value: str  # Annotation content or identifier
    annotation_value: str = None  # Optional field for additional annotation value, default is None
    created_by: Optional[str] = None  # User who created the annotation, default is None

# Schema used when creating a new annotation, inheriting from AnnotationBase
class AnnotationCreate(AnnotationBase):
    pass

# Schema for an annotation that has been stored in the database
class Annotation(AnnotationBase):
    id: int  # Unique identifier for the annotation
    created_at: datetime  # Timestamp of when the annotation was created
    document: Document  # Add relation to Document

    # Enable ORM mode to allow mapping SQLAlchemy models to Pydantic models
    class Config:
        orm_mode = True