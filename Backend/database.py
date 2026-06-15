from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 🔥 네 MySQL 정보로 바꿔줘
DATABASE_URL = "mysql+pymysql://root:apple@localhost/brand_risk_db"

engine = create_engine(
    DATABASE_URL,
    echo=True  # SQL 로그 확인용 (나중에 False로)
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=True,
)

Base = declarative_base()

# 🔥 이거 반드시 있어야 함
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    import models
    Base.metadata.create_all(bind=engine)

