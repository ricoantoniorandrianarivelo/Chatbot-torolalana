from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import relationship
import datetime

from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    preferred_language = Column(String, default="fr")
    
    chats = relationship("ChatSession", back_populates="user")

class ChatSession(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, default="Nouvelle discussion")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_archived = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    sender = Column(String) # 'user' or 'bot'
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    chat_id = Column(Integer, ForeignKey("chats.id"))
    
    chat = relationship("ChatSession", back_populates="messages")
