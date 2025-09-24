from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from api.database.connection import get_db

# Basic auth models for this simple setup
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "staff"

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

router = APIRouter(prefix="/api", tags=["auth"])

# Mock user data - in a real app this would be in the database
MOCK_USERS = [
    {"id": 1, "name": "Admin User", "email": "admin@example.com", "password": "admin123", "role": "admin"},
    {"id": 2, "name": "Staff User", "email": "staff@example.com", "password": "staff123", "role": "staff"},
]

# Mock session storage - in a real app this would use proper sessions
MOCK_SESSION = {"user_id": None}

@router.post("/login")
async def login(login_data: LoginRequest):
    """Simple login endpoint"""
    user = next((u for u in MOCK_USERS if u["email"] == login_data.email and u["password"] == login_data.password), None)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Set mock session
    MOCK_SESSION["user_id"] = user["id"]
    
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    }

@router.post("/register")
async def register(register_data: RegisterRequest):
    """Simple registration endpoint"""
    # Check if user already exists
    existing_user = next((u for u in MOCK_USERS if u["email"] == register_data.email), None)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = {
        "id": len(MOCK_USERS) + 1,
        "name": register_data.name,
        "email": register_data.email,
        "password": register_data.password,
        "role": register_data.role
    }
    MOCK_USERS.append(new_user)
    
    # Set mock session
    MOCK_SESSION["user_id"] = new_user["id"]
    
    return {
        "id": new_user["id"],
        "name": new_user["name"],
        "email": new_user["email"],
        "role": new_user["role"]
    }

@router.get("/user")
async def get_current_user():
    """Get current logged in user"""
    user_id = MOCK_SESSION.get("user_id")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    }

@router.post("/logout")
async def logout():
    """Logout current user"""
    MOCK_SESSION["user_id"] = None
    return {"message": "Logged out successfully"}