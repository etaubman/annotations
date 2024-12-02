"""
Usage on port 8000:

uvicorn main:app --reload --port 8000

"""


# ============================
# Import Statements
# ============================

# Standard Library Imports
import os
import shutil
import logging

# Third-Party Imports
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, status, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

# Local Imports
from . import models, schemas, crud
from .database import SessionLocal, engine, delete_all_data
from .seeder import seed_database
import uvicorn

# ============================
# Logging Configuration
# ============================

# Configure logging to output to the console with the INFO level
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============================
# Database Initialization
# ============================

# Create all database tables based on the models if they don't exist
delete_all_data()
models.Base.metadata.create_all(bind=engine)
logger.info("Database tables created successfully.")
seed_database()
logger.info("Database seeding complete.")

# ============================
# FastAPI Application Setup
# ============================

app = FastAPI(
    title="PDF Annotation API",
    description="An API for uploading PDF documents and managing annotations.",
    version="1.0.0"
)

# ============================
# CORS Middleware Configuration
# ============================

# Configure CORS to allow all origins (modify as needed for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("CORS middleware added to FastAPI application.")

# ============================
# Dependency: Database Session
# ============================

def get_db():
    """
    Provides a database session to path operations.

    Yields:
        Session: SQLAlchemy session instance.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        logger.debug("Database session closed.")

# ============================
# Configuration Constants
# ============================

# Directory to store uploaded PDF files
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "/app/uploaded_files")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
logger.info(f"Upload folder set to: {UPLOAD_FOLDER}")

# ============================
# Static Files Configuration
# ============================

# Mount the 'uploaded_files' directory to serve uploaded PDFs
app.mount(
    "/uploaded_files",
    StaticFiles(directory=UPLOAD_FOLDER),
    name="uploaded_files"
)
logger.info(f"Static files mounted at '/uploaded_files' serving directory: {UPLOAD_FOLDER}")

# ============================
# API Routes
# ============================

@app.post(
    "/documents/",
    response_model=schemas.Document,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a new PDF document",
    description="Uploads a PDF file and creates a corresponding document entry in the database."
)
async def upload_document(
    file: UploadFile = File(..., description="The PDF file to upload."),
    document_type_id: int = Form(None),
    db: Session = Depends(get_db)
):
    """
    Uploads a PDF document and stores it in the server's upload directory.

    Args:
        file (UploadFile): The PDF file to be uploaded.
        document_type_id (int, optional): The ID of the document type, if applicable.
        db (Session): Database session dependency.

    Returns:
        schemas.Document: The created document schema.
    """

    logger.info(f"Received file upload request: {file.filename} with document type ID: {document_type_id}")

    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        logger.warning(f"Attempted to upload non-PDF file: {file.filename}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF files are allowed."
        )
    
    # Secure the filename to prevent directory traversal attacks
    filename = os.path.basename(file.filename)
    file_location = os.path.join(UPLOAD_FOLDER, filename)
    logger.info(f"Uploading file '{filename}' to '{file_location}'.")

    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"File '{filename}' uploaded successfully.")
    except Exception as e:
        logger.error(f"Failed to upload file '{filename}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File upload failed."
        )
    finally:
        file.file.close()

    # Create or update the document record in the database
    document = crud.create_or_update_document(db=db, file_path=filename, document_type_id=document_type_id)
    logger.debug(f"Document created/updated: {document}")

    return document

@app.get(
    "/documents/",
    response_model=list[schemas.Document],
    summary="Retrieve a list of documents",
    description="Fetches a list of uploaded PDF documents with pagination support."
)
def read_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Retrieves a list of documents from the database.

    Args:
        skip (int): Number of records to skip for pagination.
        limit (int): Maximum number of records to return.
        db (Session): Database session dependency.

    Returns:
        List[schemas.Document]: A list of document schemas.
    """
    documents = crud.get_documents(db, skip=skip, limit=limit)
    logger.info(f"Retrieved {len(documents)} documents from the database.")
    return documents

@app.get(
    "/documents/{document_id}",
    response_model=schemas.Document,
    summary="Retrieve a specific document",
    description="Fetches a single document by its ID."
)
def get_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieves a specific document by its ID.

    Args:
        document_id (int): The ID of the document to retrieve.
        db (Session): Database session dependency.

    Returns:
        schemas.Document: The requested document schema.

    Raises:
        HTTPException: If the document is not found.
    """
    document = crud.get_document(db, document_id=document_id)
    if document is None:
        logger.warning(f"Document with ID {document_id} not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )
    logger.info(f"Document retrieved: {document}")
    return document

@app.post(
    "/annotations/",
    response_model=schemas.Annotation,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new annotation",
    description="Creates a new annotation for a specified document."
)
def create_annotation(
    annotation: schemas.AnnotationCreate,
    db: Session = Depends(get_db)
):
    """
    Creates a new annotation associated with a document.

    Args:
        annotation (schemas.AnnotationCreate): The annotation data.
        db (Session): Database session dependency.

    Returns:
        schemas.Annotation: The created annotation schema.
    """
    created_annotation = crud.create_annotation(db=db, annotation=annotation)
    logger.info(f"Annotation created: {created_annotation}")
    return created_annotation

@app.get(
    "/annotations/{document_id}",
    response_model=list[schemas.Annotation],
    summary="Retrieve annotations for a document",
    description="Fetches all annotations associated with a specific document."
)
def get_annotations(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieves all annotations for a given document.

    Args:
        document_id (int): The ID of the document.
        db (Session): Database session dependency.

    Returns:
        List[schemas.Annotation]: A list of annotation schemas.
    """
    annotations = crud.get_annotations_by_document(db, document_id=document_id)
    logger.info(f"Retrieved {len(annotations)} annotations for document ID {document_id}.")
    return annotations

@app.get(
    "/documents_with_annotations",
    response_model=list[schemas.DocumentWithAnnotationsCount],
    summary="Retrieve documents with annotation counts",
    description="Fetches all documents along with the count of annotations associated with each."
)
def get_documents_with_annotations_count(
    db: Session = Depends(get_db)
):
    """
    Retrieves all documents along with the number of annotations each contains.

    Args:
        db (Session): Database session dependency.

    Returns:
        List[schemas.DocumentWithAnnotationsCount]: A list of documents with annotation counts.
    """
    documents = crud.get_documents_with_annotation_count(db)
    logger.info(f"Retrieved {len(documents)} documents with annotation counts.")

    # Optional: Verify the structure of each document
    for doc in documents:
        logger.debug(f"Document: {doc}")

    return documents

@app.get(
    "/document_types/",
    response_model=list[schemas.DocumentType],
    summary="Retrieve a list of document types",
    description="Fetches a list of document types with associated data elements."
)
def read_document_types(
    db: Session = Depends(get_db)
):
    """
    Retrieves a list of document types along with their associated data elements.

    Args:
        db (Session): Database session dependency.

    Returns:
        List[schemas.DocumentType]: A list of document type schemas.
    """
    document_types = crud.get_document_types(db)
    logger.info(f"Retrieved {len(document_types)} document types from the database.")
    return document_types

@app.get(
    "/data_elements_by_document_type/{document_type_id}",
    response_model=list[schemas.DataElement],
    summary="Retrieve data elements by document type",
    description="Fetches all data elements associated with a specific document type."
)
def get_data_elements_by_document_type(
    document_type_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieves all data elements associated with a specific document type.

    Args:
        document_type_id (int): The ID of the document type.
        db (Session): Database session dependency.

    Returns:
        List[schemas.DataElement]: A list of data element schemas.
    """
    data_elements = crud.get_data_elements_for_document_type(db, document_type_id=document_type_id)
    logger.info(f"Retrieved {len(data_elements)} data elements for document type ID {document_type_id}.")
    return data_elements


# ============================
# Application Startup and Shutdown Events
# ============================

@app.on_event("startup")
def on_startup():
    """
    Actions to perform on application startup.
    """
    logger.info("FastAPI application has started.")

@app.on_event("shutdown")
def on_shutdown():
    """
    Actions to perform on application shutdown.
    """
    logger.info("FastAPI application is shutting down.")
