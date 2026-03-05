from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
import os

from . import models, schemas, crud, nlp
from .database import SessionLocal, engine, get_db

# Create DB Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Torolalana Admin Chatbot API")

origins = [
    "https://chatbot-torolalana.vercel.app",  # ton frontend Vercel
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup CORS for frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev. In prod, use specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication Configuration ---
SECRET_KEY = "torolalana_secret_key_for_dev_only" # In production, use env var
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user

# --- Routes ---

@app.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not crud.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# --- Chat Routes ---

@app.get("/chats", response_model=list[schemas.ChatListResponse])
def get_chats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_user_chats(db, user_id=current_user.id)

@app.post("/chats", response_model=schemas.ChatSessionResponse)
def create_new_chat(chat: schemas.ChatSessionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_chat = crud.create_chat(db, title=chat.title, user_id=current_user.id)
    # Add initial welcome message
    welcome_msg = "Bonjour, je suis l'assistant Torolalana. Comment puis-je vous aider aujourd'hui ? / Miarahaba, izaho no mpanampy Torolalana. Inona no azoko hanampiana anao anio?"
    crud.create_message(db, db_chat.id, content=welcome_msg, sender="bot")
    db.refresh(db_chat)
    return db_chat

@app.get("/chats/{chat_id}", response_model=schemas.ChatSessionResponse)
def read_chat(chat_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    chat = crud.get_chat(db, chat_id, user_id=current_user.id)
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@app.put("/chats/{chat_id}/rename", response_model=schemas.ChatSessionResponse)
def rename_chat(chat_id: int, title: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    chat = crud.rename_chat(db, chat_id, current_user.id, new_title=title)
    if chat is None:
         raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@app.put("/chats/{chat_id}/archive", response_model=schemas.ChatSessionResponse)
def archive_chat(chat_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    chat = crud.archive_chat(db, chat_id, current_user.id)
    if chat is None:
         raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@app.delete("/chats/{chat_id}")
def delete_chat(chat_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    chat = crud.delete_chat(db, chat_id, current_user.id)
    return {"message": "Chat deleted"}

@app.post("/chats/{chat_id}/message", response_model=schemas.MessageResponse)
def post_message(chat_id: int, message: schemas.MessageCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 1. Verify chat belongs to user
    chat = crud.get_chat(db, chat_id, current_user.id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    # 2. Save user message
    crud.create_message(db, chat_id, content=message.content, sender="user")
    
    # 3. Get NLP response
    lang_to_use = message.language if message.language else current_user.preferred_language
    bot_response_text = nlp.nlp_engine.get_answer(message.content, language=lang_to_use)
    
    # 4. Save bot message
    bot_msg = crud.create_message(db, chat_id, content=bot_response_text, sender="bot")
    
    return bot_msg
