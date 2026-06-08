from app.database import engine
import sqlalchemy as sa

with engine.connect() as conn:
    # Add sales_notes column to requests
    try:
        conn.execute(sa.text("ALTER TABLE requests ADD COLUMN sales_notes TEXT"))
        print("Added sales_notes column")
    except Exception as e:
        print(f"sales_notes: {e}")

    # Add unique constraint on professor email
    try:
        conn.execute(sa.text("ALTER TABLE professors ADD CONSTRAINT uq_professors_email UNIQUE (email)"))
        print("Added email unique constraint")
    except Exception as e:
        print(f"email unique: {e}")

    conn.commit()
    print("DONE")
