from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.models import Pebble, Folder
from app.database import pebbles_collection, folders_collection
from app.routers.auth import get_current_user

router = APIRouter()

# --- Pebbles Endpoints ---

@router.get("/pebbles", response_model=List[Pebble])
async def get_pebbles(current_user: dict = Depends(get_current_user)):
    cursor = pebbles_collection.find({"owner_id": current_user["username"], "isDeleted": False})
    pebbles = await cursor.to_list(length=1000)
    return pebbles

@router.post("/pebbles", response_model=Pebble)
async def create_pebble(pebble: Pebble, current_user: dict = Depends(get_current_user)):
    pebble.owner_id = current_user["username"]
    await pebbles_collection.insert_one(pebble.dict())
    return pebble

@router.put("/pebbles/{pebble_id}")
async def update_pebble(pebble_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    # 注意：前端可能只发部分数据，这里建议全量更新或者精细化 update
    # 简单起见，这里假设前端发送的是完整的 Pebble 对象或者部分字段
    result = await pebbles_collection.update_one(
        {"id": pebble_id, "owner_id": current_user["username"]},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Pebble not found")
    return {"status": "success"}

@router.delete("/pebbles/{pebble_id}")
async def delete_pebble(pebble_id: str, current_user: dict = Depends(get_current_user)):
    # 软删除
    await pebbles_collection.update_one(
        {"id": pebble_id, "owner_id": current_user["username"]},
        {"$set": {"isDeleted": True}}
    )
    return {"status": "deleted"}

# --- Folders Endpoints ---

@router.get("/folders", response_model=List[Folder])
async def get_folders(current_user: dict = Depends(get_current_user)):
    cursor = folders_collection.find({"owner_id": current_user["username"]})
    return await cursor.to_list(length=1000)

@router.post("/folders", response_model=Folder)
async def create_folder(folder: Folder, current_user: dict = Depends(get_current_user)):
    folder.owner_id = current_user["username"]
    await folders_collection.insert_one(folder.dict())
    return folder