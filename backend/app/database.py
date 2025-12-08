from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URL: str
    DB_NAME: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    
    # 修改这里：替换 Gemini 为 DeepSeek
    DEEPSEEK_API_KEY: str
    DEEPSEEK_BASE_URL: str

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

client = AsyncIOMotorClient(settings.MONGO_URL)
db = client[settings.DB_NAME]

# 集合引用
users_collection = db.get_collection("users")
pebbles_collection = db.get_collection("pebbles")
folders_collection = db.get_collection("folders")