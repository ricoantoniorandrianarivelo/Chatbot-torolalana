from sqlalchemy.orm import Session
from . import models, schemas
import bcrypt

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_byte_enc = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_byte_enc, hashed_password_byte_enc)

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email, 
        name=user.name, 
        hashed_password=hashed_password,
        preferred_language=user.preferred_language
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_chats(db: Session, user_id: int):
    return db.query(models.ChatSession).filter(models.ChatSession.user_id == user_id).order_by(models.ChatSession.created_at.desc()).all()

def create_chat(db: Session, title: str, user_id: int):
    db_chat = models.ChatSession(title=title, user_id=user_id)
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return db_chat
    
def get_chat(db: Session, chat_id: int, user_id: int):
    return db.query(models.ChatSession).filter(
        models.ChatSession.id == chat_id,
        models.ChatSession.user_id == user_id
    ).first()

def archive_chat(db: Session, chat_id: int, user_id: int):
    chat = get_chat(db, chat_id, user_id)
    if chat:
        chat.is_archived = True
        db.commit()
        db.refresh(chat)
    return chat

def rename_chat(db: Session, chat_id: int, user_id: int, new_title: str):
    chat = get_chat(db, chat_id, user_id)
    if chat:
        chat.title = new_title
        db.commit()
        db.refresh(chat)
    return chat

def delete_chat(db: Session, chat_id: int, user_id: int):
    chat = get_chat(db, chat_id, user_id)
    if chat:
        db.delete(chat)
        db.commit()
    return chat

def create_message(db: Session, chat_id: int, content: str, sender: str):
    db_msg = models.Message(content=content, sender=sender, chat_id=chat_id)
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg
