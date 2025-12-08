from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Union, Any
from enum import Enum
import time

# --- Enums ---
class CognitiveLevel(str, Enum):
    ELI5 = "ELI5"
    ACADEMIC = "ACADEMIC"

# --- Content Blocks ---
class MainBlock(BaseModel):
    type: str # 'text', 'pull_quote', 'key_points'
    heading: Optional[str] = None
    iconType: Optional[str] = "default"
    # body 可能是字符串或字符串列表(key_points)，在前端处理了，后端存 Any 或 Union
    body: Union[str, List[str]]
    isUserEdited: Optional[bool] = False

class SidebarBlock(BaseModel):
    type: str # 'definition', 'profile', 'stat'
    heading: str
    body: str
    emoji: Optional[str] = None
    isUserEdited: Optional[bool] = False

class LevelContent(BaseModel):
    title: str
    summary: str
    emojiCollage: List[str]
    mainContent: List[MainBlock]
    sidebarContent: List[SidebarBlock]
    keywords: List[str]

# --- Pebble Data ---
class Pebble(BaseModel):
    # 我们使用前端生成的 uuid 作为 id，方便迁移，也可以映射到 MongoDB 的 _id
    id: str 
    topic: str
    timestamp: float
    folderId: Optional[str] = None
    isVerified: bool = False
    isDeleted: bool = False
    # 这里的 Dict key 是 CognitiveLevel 的值 ('ELI5', 'ACADEMIC')
    content: Dict[str, LevelContent] 
    socraticQuestions: List[str]
    owner_id: Optional[str] = None # 关联到用户

# --- Folder Data ---
class Folder(BaseModel):
    id: str
    name: str
    parentId: Optional[str] = None
    createdAt: float
    owner_id: Optional[str] = None

# --- User Auth ---
class UserRegister(BaseModel):
    username: str
    password: str

class UserInDB(BaseModel):
    username: str
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str