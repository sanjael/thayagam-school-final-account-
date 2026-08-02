from app.database import get_db
from app.models import Class, FeeStructure
from decimal import Decimal

def cleanup_and_seed_single():
    db = next(get_db())
    classes_by_name = {c.name.strip(): c.id for c in db.query(Class).all()}
    print("Classes in DB:", classes_by_name)

    # 1. Delete ALL existing fee structures from Supabase DB to remove duplicates completely
    deleted_count = db.query(FeeStructure).delete()
    db.commit()
    print(f" Deleted {deleted_count} old fee structure entries.")

    fees_to_add = []
    ay = "2026-2027"

    # Specific Tuition Fees Mapping
    specific_tuition = {
        "Class 6": {"Term 1": 16000, "Term 2": 11000, "Term 3": 8000},
        "Class 7": {"Term 1": 16000, "Term 2": 13000, "Term 3": 8000},
        "Class 8": {"Term 1": 16000, "Term 2": 14000, "Term 3": 8000},
        "Class 9": {"Term 1": 17000, "Term 2": 15000, "Term 3": 11000},
        "Class 10": {"Term 1": 25000, "Term 2": 15000, "Term 3": 10000},
        "Class 11": {"Term 1": 20000, "Term 2": 20000, "Term 3": 11000},
        "Class 12": {"Term 1": 25000, "Term 2": 25000, "Term 3": 10000},
    }

    all_class_names = [
        "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
        "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"
    ]

    for cname in all_class_names:
        cid = classes_by_name.get(cname)
        if not cid:
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

        # 2. Tuition Fees
        if cname in specific_tuition:
            terms_dict = specific_tuition[cname]
            for term_name, amount in terms_dict.items():
                fees_to_add.append(FeeStructure(
                    class_id=cid,
                    fee_type="Tuition Fee",
                    term=term_name,
                    amount=Decimal(str(amount)),
                    academic_year=ay
                ))
        else:
            # Default for LKG - Class 5
            fees_to_add.append(FeeStructure(
                class_id=cid,
                fee_type="Tuition Fee",
                term="Term 1",
                amount=Decimal("5000"),
                academic_year=ay
            ))
            fees_to_add.append(FeeStructure(
                class_id=cid,
                fee_type="Tuition Fee",
                term="Term 2",
                amount=Decimal("5000"),
                academic_year=ay
            ))

    db.add_all(fees_to_add)
    db.commit()
    print(f" Successfully inserted EXACTLY {len(fees_to_add)} unique fee structure records for '{ay}'!")

if __name__ == "__main__":
    cleanup_and_seed_single()
