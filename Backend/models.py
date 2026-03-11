from sqlalchemy import Column, Integer, BigInteger, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class BrandRiskAnalysis(Base):
    __tablename__ = "brand_risk_analysis"

    id = Column(Integer, primary_key=True, index=True)

    brand_name = Column(String(255), nullable=False)

    total_videos = Column(Integer)
    total_comments = Column(Integer)

    positive_ratio = Column(Float)
    negative_ratio = Column(Float)
    neutral_ratio = Column(Float)

    top_keywords = Column(Text)

    risk_score = Column(Float)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BrandRiskStrategy(Base):
    __tablename__ = "brand_risk_strategy"

    id = Column(Integer, primary_key=True, index=True)

    analysis_id = Column(
        Integer,
        ForeignKey("brand_risk_analysis.id", ondelete="CASCADE")
    )

    risk_summary = Column(Text)
    risk_type = Column(String(100))   # 길이 추가
    risk_strategy = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True)

    brands = relationship("Brand", back_populates="company")
    users = relationship("User", back_populates="company")


class Brand(Base):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))

    company_id = Column(Integer, ForeignKey("companies.id"))

    company = relationship("Company", back_populates="brands")
    users = relationship("User", back_populates="brand")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String(255), unique=True, index=True)
    password = Column(String(255))
    name = Column(String(255))

    company_id = Column(Integer, ForeignKey("companies.id"))
    brand_id = Column(Integer, ForeignKey("brands.id"))

    company = relationship("Company", back_populates="users")
    brand = relationship("Brand", back_populates="users")