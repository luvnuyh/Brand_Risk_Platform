from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class BrandRiskAnalysis(Base):
    __tablename__ = "brand_risk_analysis"

    id             = Column(Integer, primary_key=True, index=True)
    brand_name     = Column(String(255), nullable=False)
    total_videos   = Column(Integer)
    total_comments = Column(Integer)

    positive_ratio = Column(Float)
    negative_ratio = Column(Float)
    neutral_ratio  = Column(Float)

    top_keywords      = Column(Text)
    risk_score        = Column(Float)
    risk_level        = Column(String(20))
    final_risk_score  = Column(Float)
    person_risk_score = Column(Float)

    taxonomy_summary = Column(Text)
    crisis_feed = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    person_risks = relationship(
        "PersonRiskAnalysis",
        back_populates="brand_analysis",
        cascade="all, delete-orphan"
    )


class PersonRiskAnalysis(Base):
    __tablename__ = "person_risk_analysis"

    id                = Column(Integer, primary_key=True, index=True)
    brand_analysis_id = Column(Integer, ForeignKey("brand_risk_analysis.id", ondelete="CASCADE"), nullable=False)

    person_name       = Column(String(100), nullable=False)
    articles_analyzed = Column(Integer)

    positive_ratio = Column(Float)
    negative_ratio = Column(Float)
    neutral_ratio  = Column(Float)

    risk_score     = Column(Float)
    risk_level     = Column(String(20))
    impact_message = Column(String(100))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    brand_analysis = relationship("BrandRiskAnalysis", back_populates="person_risks")


class BrandPerson(Base):
    """브랜드에 등록된 연관 인물 (앰배서더, 모델, 임원 등)"""
    __tablename__ = "brand_persons"

    id         = Column(Integer, primary_key=True, index=True)
    brand_id   = Column(Integer, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String(100), nullable=False)   # 인물명
    role       = Column(String(100))                   # 역할 (앰배서더, 광고모델, 임원 등)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    brand = relationship("Brand", back_populates="persons")


class BrandRiskStrategy(Base):
    __tablename__ = "brand_risk_strategy"

    id          = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("brand_risk_analysis.id", ondelete="CASCADE"))

    risk_summary  = Column(Text)
    risk_type     = Column(String(100))
    risk_strategy = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Company(Base):
    __tablename__ = "companies"

    id   = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True)

    brands = relationship("Brand", back_populates="company")
    users  = relationship("User",  back_populates="company")


class Brand(Base):
    __tablename__ = "brands"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(255))
    company_id = Column(Integer, ForeignKey("companies.id"))

    company = relationship("Company", back_populates="brands")
    users   = relationship("User",    back_populates="brand")
    persons = relationship("BrandPerson", back_populates="brand", cascade="all, delete-orphan")
    invitations = relationship("Invitation", back_populates="brand", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id       = Column(Integer, primary_key=True, index=True)
    email    = Column(String(255), unique=True, index=True)
    password = Column(String(255))
    name     = Column(String(255))

    plan              = Column(SAEnum('personal', 'pro', 'enterprise'), nullable=False, default='pro')
    slack_webhook_url = Column(String(500), nullable=True)

    company_id = Column(Integer, ForeignKey("companies.id"))
    brand_id   = Column(Integer, ForeignKey("brands.id"))

    company     = relationship("Company", back_populates="users")
    brand       = relationship("Brand",   back_populates="users")
    # 내가 보낸 초대들
    sent_invites = relationship("Invitation", back_populates="inviter", cascade="all, delete-orphan")


class Invitation(Base):
    __tablename__ = "invitations"

    id         = Column(Integer, primary_key=True, index=True)
    brand_id   = Column(Integer, ForeignKey("brands.id",  ondelete="CASCADE"), nullable=False)
    inviter_id = Column(Integer, ForeignKey("users.id",   ondelete="CASCADE"), nullable=False)
    email      = Column(String(255), nullable=False)
    token      = Column(String(512), nullable=False, unique=True)
    status     = Column(SAEnum('pending', 'accepted', 'expired'), default='pending')
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    brand   = relationship("Brand", back_populates="invitations")
    inviter = relationship("User",  back_populates="sent_invites")

