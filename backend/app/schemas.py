from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class MessageBase(BaseModel):
    content: str
    sender: str

class MessageCreate(MessageBase):
    language: Optional[str] = None

class MessageResponse(MessageBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

class ChatSessionBase(BaseModel):
    title: str

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSessionResponse(ChatSessionBase):
    id: int
    created_at: datetime
    is_archived: bool
    messages: List[MessageResponse] = []
    
    class Config:
        from_attributes = True

class ChatListResponse(ChatSessionBase):
    id: int
    created_at: datetime
    is_archived: bool
    
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str
    preferred_language: str = "fr"

class UserResponse(UserBase):
    id: int
    preferred_language: str
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
