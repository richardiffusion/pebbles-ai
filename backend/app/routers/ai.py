from fastapi import APIRouter, Depends, Body
from app.gemini_service import generate_pebble_logic, rewrite_text_logic
from app.routers.auth import get_current_user
from app.database import pebbles_collection
from app.models import Pebble, RewriteRequest


router = APIRouter()

@router.post("/generate", response_model=Pebble)
async def generate_pebble_endpoint(
    topic: str = Body(..., embed=True),
    context_pebbles: list = Body(default=[], embed=True),
    current_user: dict = Depends(get_current_user)
):
    # 1. 调用 AI 生成
    new_pebble = await generate_pebble_logic(topic, context_pebbles)
    
    # 2. 自动保存到数据库
    new_pebble.owner_id = current_user["username"]
    await pebbles_collection.insert_one(new_pebble.dict())
    
    return new_pebble

# ★★★ 新增：改写接口 ★★★
@router.post("/rewrite")
async def rewrite_text(request: RewriteRequest, current_user: dict = Depends(get_current_user)):
    new_text = await rewrite_text_logic(request.text, request.mode)
    return {"text": new_text}