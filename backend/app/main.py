from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, clients

app = FastAPI(title="Sales Co-Pilot Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(clients.router)
