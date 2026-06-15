from dotenv import load_dotenv
import os
from fastapi import FastAPI
from database import engine, Base
import models
from app import router  # 🔥 router만 import
from database import init_db
from fastapi.middleware.cors import CORSMiddleware
from routers import invite

app = FastAPI()

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()


init_db()

app.include_router(router)  # 🔥 여기에 등록

Base.metadata.create_all(bind=engine)

app.include_router(invite.router,prefix="/invite")

