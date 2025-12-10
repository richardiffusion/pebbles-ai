# backend/app/ai_service.py (或 gemini_service.py)

# ... 之前的 import 保持不变 ...
from openai import AsyncOpenAI
from app.database import settings
from app.models import Pebble, LevelContent, MainBlock, SidebarBlock
import json
import uuid
import time

client = AsyncOpenAI(
    api_key=settings.DEEPSEEK_API_KEY,
    base_url=settings.DEEPSEEK_BASE_URL,
)

async def generate_pebble_logic(topic: str, context_pebbles: list) -> Pebble:
    context_str = ""
    if context_pebbles:
        context_str = "CONTEXT NODES:\n" + "\n".join(
            [f"- {p['topic']}: {p['content']['ELI5']['summary']}" for p in context_pebbles]
        )

    system_prompt = "You are 'Pebbles', a Cognitive Architect. You output VALID JSON only."
    
    user_prompt = f"""
    Topic: "{topic}"
    {context_str}

    Generate a high-density, magazine-style knowledge artifact.
    
    REQUIRED JSON STRUCTURE (Strictly follow field names):
    {{
      "eli5_content": {{
        "title": "...",
        "summary": "...",
        "emojiCollage": ["emoji1", "emoji2", "emoji3"],
        "mainContent": [
           {{ "type": "text", "heading": "...", "body": "...", "iconType": "idea" }},
           {{ "type": "key_points", "body": "Point 1|Point 2|Point 3" }}
        ],
        "sidebarContent": [
           {{ "type": "definition", "heading": "Term Name", "body": "Definition text...", "emoji": "📖" }},
           {{ "type": "stat", "heading": "1990", "body": "Year discovered", "emoji": "📅" }}
        ],
        "keywords": ["tag1", "tag2"]
      }},
      "academic_content": {{ ... same structure as eli5 ... }},
      "socratic_questions": ["Question 1?", "Question 2?", "Question 3?"]
    }}
    
    CONSTRAINTS:
    1. SidebarBlock allowed types: 'definition', 'profile', 'stat'.
    2. MainBlock allowed iconTypes: 'definition', 'history', 'idea', 'controversy', 'future', 'analysis', 'default'.
    3. Do NOT use markdown formatting.
    """

    try:
        response = await client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={ "type": "json_object" }, 
            temperature=1.3,
        )

        content_str = response.choices[0].message.content
        if content_str.startswith("```json"):
            content_str = content_str.replace("```json", "").replace("```", "")
        
        data = json.loads(content_str)

        # --- 容错清洗函数 ---
        def sanitize_sidebar_block(sb: dict) -> SidebarBlock:
            if 'heading' not in sb:
                sb['heading'] = sb.get('title', "Info")
            
            valid_types = ['definition', 'profile', 'stat']
            if 'type' not in sb or sb['type'] not in valid_types:
                sb['type'] = 'definition'
            
            if 'body' not in sb:
                 sb['body'] = sb.get('description', '') or "No content"

            return SidebarBlock(**sb)

        def process_content(content_data):
            main_blocks = []
            for b in content_data.get('mainContent', []):
                if b.get('type') == 'key_points' and isinstance(b.get('body'), str):
                    b['body'] = [s.strip() for s in b['body'].split('|')]
                if 'iconType' not in b:
                    b['iconType'] = 'default'
                main_blocks.append(MainBlock(**b))
            
            sidebar_blocks = []
            for sb in content_data.get('sidebarContent', []):
                try:
                    sidebar_blocks.append(sanitize_sidebar_block(sb))
                except Exception as e:
                    print(f"Skipping invalid sidebar block: {sb} error: {e}")

            # --- ★★★ 修复点在这里 ★★★ ---
            # 从 content_data 中移除原始的 'mainContent' 和 'sidebarContent'
            # 避免传参冲突
            clean_data = {
                k: v for k, v in content_data.items() 
                if k not in ['mainContent', 'sidebarContent']
            }

            return LevelContent(
                **clean_data, # 使用清洗过的字典
                mainContent=main_blocks,
                sidebarContent=sidebar_blocks
            )

        pebble = Pebble(
            id=str(uuid.uuid4()),
            topic=topic,
            timestamp=time.time() * 1000,
            content={
                "ELI5": process_content(data['eli5_content']),
                "ACADEMIC": process_content(data['academic_content'])
            },
            socraticQuestions=data.get('socratic_questions', [])
        )
        
        return pebble

    except Exception as e:
        print(f"DeepSeek Generation Error: {e}")
        raise e
    

# ★★★ 新增：文本改写逻辑 ★★★
async def rewrite_text_logic(text: str, mode: str) -> str:
    instructions = {
        "improve": "Rewrite this text to be more clear, professional, and engaging. Keep the same meaning.",
        "shorter": "Summarize this text. Make it concise and punchy. Remove fluff.",
        "longer": "Expand on this text. Add more detail, context, and explanation.",
        "simplify": "Explain this like I'm 5 years old. Use simple words and analogies."
    }

    instruction = instructions.get(mode, instructions["improve"])

    system_prompt = "You are an expert editor. You output ONLY the rewritten text. No intro, no quotes."
    user_prompt = f"Instruction: {instruction}\n\nOriginal Text: {text}"

    try:
        response = await client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Rewrite Error: {e}")
        raise e