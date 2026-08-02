from app.database import get_db
from app.models import Class, FeeStructure
from decimal import Decimal

def master_fee_seed():
    db = next(get_db())
    classes_by_name = {c.name.strip(): c.id for c in db.query(Class).all()}
    print("Classes in DB:", classes_by_name)

    # Delete all existing fee structure entries to avoid any duplicates
    deleted_count = db.query(FeeStructure).delete()
    db.commit()
    print(f" Cleared {deleted_count} old fee structure records.")

    ay = "2026-2027"
    fees_to_add = []

    # Master Fee Mapping per Class
    master_tuition = {
        "LKG":     {"Term 1": 5000,  "Term 2": 5000,  "Term 3": 5000},
        "UKG":     {"Term 1": 5000,  "Term 2": 5000,  "Term 3": 5000},
        "Class 1": {"Term 1": 11000, "Term 2": 7000,  "Term 3": 7000},
        "Class 2": {"Term 1": 12000, "Term 2": 8000,  "Term 3": 7000},
        "Class 3": {"Term 1": 13000, "Term 2": 10000, "Term 3": 6000},
        "Class 4": {"Term 1": 14000, "Term 2": 10000, "Term 3": 6000},
        "Class 5": {"Term 1": 15000, "Term 2": 10000, "Term 3": 6000},
        "Class 6": {"Term 1": 16000, "Term 2": 11000, "Term 3": 8000},
        "Class 7": {"Term 1": 16000, "Term 2": 13000, "Term 3": 8000},
        "Class 8": {"Term 1": 16000, "Term 2": 14000, "Term 3": 8000},
        "Class 9": {"Term 1": 17000, "Term 2": 15000, "Term 3": 11000},
        "Class 10": {"Term 1": 25000, "Term 2": 15000, "Term 3": 10000},
        "Class 11": {"Term 1": 20000, "Term 2": 20000, "Term 3": 11000},
        "Class 12": {"Term 1": 25000, "Term 2": 25000, "Term 3": 10000},
    }

    all_class_names = list(master_tuition.keys())

    for cname in all_class_names:
        cid = classes_by_name.get(cname)
        if not cid:
            print(f" Warning: Class '{cname}' not found in DB!")
            continue

        # 1. Books Fee (5000 for ALL classes EXCEPT Class 10)
        if cname != "Class 10":
            fees_to_add.append(FeeStructure(
                class_id=cid,
                fee_type="Books Fee",
                term="Term 1",
                amount=Decimal("5000"),
                academic_year=ay
            ))

        # 2. Tuition Fees for Term 1, Term 2, Term 3
        terms_dict = master_tuition[cname]
        for term_name, amount in terms_dict.items():
            fees_to_add.append(FeeStructure(
                class_id=cid,
                fee_type="Tuition Fee",
                term=term_name,
                amount=Decimal(str(amount)),
                academic_year=ay
            ))

    db.add_all(fees_to_add)
    db.commit()
    print(f" Successfully inserted {len(fees_to_add)} master fee structure records for Academic Year '{ay}'!")

if __name__ == "__main__":
    master_fee_seed()
