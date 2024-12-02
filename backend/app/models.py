# ============================
# SQLAlchemy ORM Models
# ============================

"""
This module defines the SQLAlchemy ORM models for the application,
including the Document and Annotation entities. These models represent
the database tables and their relationships.
"""

# ============================
# Import Statements
# ============================

from typing import List, Optional

from sqlalchemy import Float, ForeignKey, Integer, String, DateTime, Boolean, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from .database import Base


# ============================
# Document Type to Data Element Model Association
# ============================

document_data_elements = Table(
    "document_data_elements",
    Base.metadata,
    Column("document_type_id", Integer, ForeignKey("document_types.id"), primary_key=True),
    Column("data_element_id", Integer, ForeignKey("data_elements.id"), primary_key=True),
    Column("is_required", Boolean, nullable=False, default=False, doc="Flag indicating if the data element is required."),
    Column("allow_multiple", Boolean, nullable=False, default=False, doc="Flag indicating if multiple values are allowed."),
)

# ============================
# Document Types Model
# ============================

class DocumentType(Base):
    """
    Represents a type of document that can be uploaded by the user.

    Attributes:
        id (Mapped[int]): Primary key identifier for the document type.
        name (Mapped[str]): Name of the document type.
        description (Mapped[Optional[str]]): Description of the document type.
    """
    __tablename__ = "document_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)

# ============================
# Document Type Data Elements Model
# ============================

class DataElement(Base):
    """
    Represents data elements associated with a specific document type.

    Attributes:
        id (Mapped[int]): Primary key identifier for the data element.
        name (Mapped[str]): Name of the data element.
        description (Mapped[Optional[str]]): Description of the data element.
    """
    __tablename__ = "data_elements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)


# ============================
# Document Model
# ============================

class Document(Base):
    """
    Represents a PDF document uploaded by the user.

    Attributes:
        id (Mapped[int]): Primary key identifier for the document.
        file_path (Mapped[str]): Unique file path where the PDF is stored.
        uploaded_at (Mapped[datetime]): Timestamp when the document was uploaded.
        annotations (Mapped[List["Annotation"]]): List of annotations associated with the document.
    """
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    file_path: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    document_type_id: Mapped[int] = mapped_column(Integer, ForeignKey('document_types.id'), nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String, nullable=True, doc="User who uploaded the document.")
    
    # Relationship to Annotation model with cascade delete to maintain referential integrity
    annotations: Mapped[List["Annotation"]] = relationship(
        "Annotation",
        back_populates="document",
        cascade="all, delete-orphan",
        doc="List of annotations associated with the document."
    )

    # Relationship to DocumentType model
    document_type: Mapped[Optional[DocumentType]] = relationship(
        "DocumentType",
        backref="documents",
        doc="The type of document associated with this entry."
    )


# ============================
# Annotation Model
# ============================

class Annotation(Base):
    """
    Represents an annotation made on a specific page of a PDF document.

    Attributes:
        id (Mapped[int]): Primary key identifier for the annotation.
        document_id (Mapped[int]): Foreign key linking to the associated Document.
        page (Mapped[int]): Page number where the annotation is located.
        x (Mapped[float]): X-coordinate of the annotation's position.
        y (Mapped[float]): Y-coordinate of the annotation's position.
        width (Mapped[float]): Width of the annotation area.
        height (Mapped[float]): Height of the annotation area.
        value (Mapped[str]): Title or name of the annotation.
        created_at (Mapped[datetime]): Timestamp when the annotation was created.
        annotation_value (Mapped[Optional[str]]): Additional details or value of the annotation.
        document (Mapped[Document]): Relationship back to the associated Document.
    """
    __tablename__ = "annotations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey('documents.id'), nullable=False)
    page: Mapped[int] = mapped_column(Integer, nullable=False, doc="Page number where the annotation is located.")
    x: Mapped[float] = mapped_column(Float, nullable=False, doc="X-coordinate of the annotation's position.")
    y: Mapped[float] = mapped_column(Float, nullable=False, doc="Y-coordinate of the annotation's position.")
    width: Mapped[float] = mapped_column(Float, nullable=False, doc="Width of the annotation area.")
    height: Mapped[float] = mapped_column(Float, nullable=False, doc="Height of the annotation area.")
    value: Mapped[str] = mapped_column(String, nullable=False, doc="Title or name of the annotation.")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, doc="Timestamp of when the annotation was created.")
    annotation_value: Mapped[Optional[str]] = mapped_column(String, nullable=True, doc="Additional details or value of the annotation.")
    created_by: Mapped[Optional[str]] = mapped_column(String, nullable=True, doc="User who created the annotation.")
    
    # Relationship back to Document model
    document: Mapped[Document] = relationship(
        "Document",
        back_populates="annotations",
        doc="The document to which this annotation belongs."
    )


# ============================
# Additional Notes
# ============================

"""
Additional Considerations:

1. **Type Annotations**:
    - Utilized `Mapped[]` from `sqlalchemy.orm` to provide explicit type annotations for ORM attributes.
    - This enhances type safety and clarity, facilitating better integration with type-checking tools like `mypy`.

2. **mapped_column() vs Column()**:
    - Replaced `Column()` with `mapped_column()` to align with SQLAlchemy 2.0's recommended approach.
    - This provides better integration with type annotations and future-proofs the code.

3. **Relationship Configuration**:
    - The `annotations` relationship in the `Document` model uses `cascade="all, delete-orphan"` to ensure that all associated annotations are deleted when a document is removed. This maintains referential integrity within the database.

4. **Docstrings and Inline Documentation**:
    - Comprehensive docstrings have been added to each class and its attributes to explain their purpose and usage.
    - Inline comments clarify specific configurations and relationships within the models.

5. **Nullable Constraints**:
    - Essential fields are marked as `nullable=False` to enforce data integrity.
    - The `annotation_value` field in the `Annotation` model is optional (`nullable=True`), allowing flexibility for annotations that may not require additional details.

6. **Indexing**:
    - Added `index=True` to frequently queried fields like `id` and `file_path` to optimize database performance.

7. **Foreign Key Constraints**:
    - The `document_id` in the `Annotation` model is a foreign key referencing the `id` in the `Document` model, establishing a many-to-one relationship between annotations and documents.

8. **Default Values**:
    - `uploaded_at` and `created_at` fields are automatically set to the current UTC time upon creation using `default=datetime.utcnow`, ensuring accurate timestamping.

9. **String Lengths (Optional Enhancement)**:
    - For fields like `file_path`, `value`, and `annotation_value`, consider specifying a maximum length (e.g., `String(255)`) to enforce data constraints and optimize storage.

10. **Consistency in Naming**:
    - Ensured that class and attribute names are clear, descriptive, and follow a consistent naming convention, enhancing code clarity.

11. **Import Order and Best Practices**:
    - Organized imports into standard library imports, third-party imports, and local imports for better readability.
    - Utilized relative imports (e.g., `from .database import Base`) assuming this module is part of a package.

12. **Future Scalability**:
    - The structured and well-documented codebase facilitates easier future enhancements and maintenance.
    - Adding new features or modifying existing ones becomes straightforward due to the clear organization and comprehensive documentation.
"""

