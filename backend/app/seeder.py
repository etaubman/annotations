
from sqlalchemy.orm import Session
from .database import SessionLocal, engine
from . import models, crud

def seed_document_type(name: str, description: str = None):
    db: Session = SessionLocal()
    try:
        crud.create_document_type(db=db, name=name, description=description)
        print(f"Document type '{name}' added successfully.")
    except Exception as e:
        print(f"Error adding document type '{name}': {e}")
    finally:
        db.close()

def seed_data_element(name: str, description: str = None):
    db: Session = SessionLocal()
    try:
        crud.create_data_element(db=db, name=name, description=description)
        print(f"Data element '{name}' added successfully.")
    except Exception as e:
        print(f"Error adding data element '{name}': {e}")
    finally:
        db.close()

def seed_association(document_type_id: int, data_element_id: int, is_required: bool = False, allow_multiple: bool = False):
    db: Session = SessionLocal()
    try:
        crud.associate_data_element_with_document_type(db=db, document_type_id=document_type_id, data_element_id=data_element_id, is_required=is_required, allow_multiple=allow_multiple)
        print(f"Data element ID {data_element_id} associated with Document type ID {document_type_id} successfully.")
    except Exception as e:
        print(f"Error associating data element ID {data_element_id} with Document type ID {document_type_id}: {e}")
    finally:
        db.close()


def seed_database():

    # Seed document types
    seed_document_type("Credit Agreement", "A legal agreement outlining the terms and conditions for extending credit.")
    seed_document_type("Draw Notice", "A notice sent by a lender to a borrower to request a drawdown of funds.")

    # Seed data elements for credit agreement
    seed_data_element("Borrower Name", "The name of the person or entity borrowing the money.")
    seed_data_element("Lender Name", "The name of the person or entity lending the money.")
    seed_data_element("Loan Amount", "The total amount of money being borrowed.")
    seed_data_element("Interest Rate", "The percentage of the loan amount charged as interest.")
    seed_data_element("Loan Term", "The duration over which the loan is to be repaid.")
    seed_data_element("Repayment Schedule", "The schedule outlining the repayment of the loan.")
    seed_data_element("Collateral Description", "A description of the assets pledged as security for the loan.")
    seed_data_element("Loan Purpose", "The purpose for which the loan is being taken.")
    seed_data_element("Financial Covenants", "The financial conditions that the borrower must adhere to.")
    seed_data_element("Guarantor Information", "Information about the person or entity guaranteeing the loan.")
    seed_data_element("Origination Fees", "The fees charged for processing the loan.")
    seed_data_element("Prepayment Penalties", "The penalties for paying off the loan early.")
    seed_data_element("Default Conditions", "The conditions under which the borrower is considered to be in default.")
    seed_data_element("Amendment Clauses", "The clauses outlining how the loan agreement can be amended.")
    seed_data_element("Governing Law", "The legal jurisdiction governing the loan agreement.")
    seed_data_element("Disbursement Schedule", "The schedule outlining the disbursement of the loan funds.")
    seed_data_element("Signatory Parties", "The parties who have signed the loan agreement.")
    seed_data_element("Effective Date", "The date on which the loan agreement becomes effective.")
    seed_data_element("Maturity Date", "The date on which the loan is to be fully repaid.")
    seed_data_element("Payment Instructions", "The instructions for making loan payments.")

    # Seed data elements for draw notice
    seed_data_element("Borrower Name", "The name of the person or entity borrowing the money.")
    seed_data_element("Lender Name", "The name of the person or entity lending the money.")
    seed_data_element("Loan Amount", "The total amount of money being borrowed.")
    seed_data_element("Drawdown Amount", "The amount being requested as a drawdown.")
    seed_data_element("Drawdown Date", "The date on which the drawdown is requested.")
    seed_data_element("Drawdown Purpose", "The purpose for which the drawdown is being requested.")
    seed_data_element("Drawdown Instructions", "The instructions for processing the drawdown.")
    seed_data_element("Drawdown Authorization", "The authorization for the drawdown request.")

    # Associate data elements with document types (do many at random)
    seed_association(1, 1, is_required=True)
    seed_association(1, 2, is_required=True)
    seed_association(1, 3, is_required=True)
    seed_association(1, 4, is_required=True)
    seed_association(1, 5, is_required=True)
    seed_association(1, 6, is_required=True)
    seed_association(1, 7, is_required=True)
    seed_association(1, 8, is_required=True)
    seed_association(1, 9, is_required=True)
    seed_association(1, 10, is_required=True)
    seed_association(1, 11, is_required=True)
    seed_association(1, 12, is_required=True)
    seed_association(1, 13, is_required=True)
    seed_association(1, 14, is_required=True)
    seed_association(1, 15, is_required=True)
    seed_association(1, 16, is_required=True)
    seed_association(1, 17, is_required=True)
    seed_association(1, 18, is_required=True)
    seed_association(1, 19, is_required=True)
    seed_association(1, 20, is_required=True)

    seed_association(2, 21, is_required=True)
    seed_association(2, 22, is_required=True)
    seed_association(2, 23, is_required=True)
    seed_association(2, 24, is_required=True)
    seed_association(2, 25, is_required=True)
    seed_association(2, 26, is_required=True)
    seed_association(2, 27, is_required=True)
    seed_association(2, 28, is_required=True)
