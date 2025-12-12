# backend/app/gemini_service.py (或 ai_service.py)

import json
import uuid
import time
import google.generativeai as genai
from openai import AsyncOpenAI
from app.database import settings
from app.models import Pebble, LevelContent, MainBlock, SidebarBlock

# ==========================================
# 1. 通用辅助函数 (数据清洗) - 保持不变
# ==========================================
def _process_json_to_pebble(data: dict, topic: str) -> Pebble:
    """将 AI 返回的原始 JSON 转换为标准的 Pebble 对象"""
    
    def sanitize_sidebar_block(sb: dict) -> SidebarBlock:
        if 'heading' not in sb: sb['heading'] = sb.get('title', "Info")
        valid_types = ['definition', 'profile', 'stat']
        if 'type' not in sb or sb['type'] not in valid_types: sb['type'] = 'definition'
        if 'body' not in sb: sb['body'] = sb.get('description', '') or "No content"
        return SidebarBlock(**sb)

    def process_content(content_data):
        main_blocks = []
        for b in content_data.get('mainContent', []):
            if b.get('type') == 'key_points' and isinstance(b.get('body'), str):
                b['body'] = [s.strip() for s in b['body'].split('|')]
            if 'iconType' not in b: b['iconType'] = 'default'
            main_blocks.append(MainBlock(**b))
        
        sidebar_blocks = []
        for sb in content_data.get('sidebarContent', []):
            try:
                sidebar_blocks.append(sanitize_sidebar_block(sb))
            except Exception:
                pass

        # 移除已处理字段，防止传参冲突
        clean_data = {k: v for k, v in content_data.items() if k not in ['mainContent', 'sidebarContent']}
        
        return LevelContent(
            **clean_data,
            mainContent=main_blocks,
            sidebarContent=sidebar_blocks
        )

    return Pebble(
        id=str(uuid.uuid4()),
        topic=topic,
        timestamp=time.time() * 1000,
        content={
            "ELI5": process_content(data.get('eli5_content', {})),
            "ACADEMIC": process_content(data.get('academic_content', {}))
        },
        socraticQuestions=data.get('socratic_questions', [])
    )

def _build_prompt(topic: str, context_pebbles: list) -> str:
    context_str = ""
    if context_pebbles:
        context_str = "CONTEXT NODES:\n" + "\n".join(
            [f"- {p['topic']}: {p['content']['ELI5']['summary']}" for p in context_pebbles]
        )
        
    return f"""
    You are 'Pebbles', a Cognitive Architect.
    Topic: "{topic}"
    {context_str}

    Generate a high-density, magazine-style knowledge artifact.
    OUTPUT MUST BE RAW JSON. NO MARKDOWN.
    
    REQUIRED JSON STRUCTURE:
    {{
      "eli5_content": {{
        "title": "...", "summary": "...", "emojiCollage": ["e1", "e2"],
        "mainContent": [ {{ "type": "text", "heading": "...", "body": "...", "iconType": "idea" }} ],
        "sidebarContent": [ {{ "type": "definition", "heading": "...", "body": "..." }} ],
        "keywords": ["..."]
      }},
      "academic_content": {{ ... same structure ... }},
      "socratic_questions": ["Q1?", "Q2?"]
    }}
    """

# ==========================================
# 2. DeepSeek 实现
# ==========================================
async def _generate_with_deepseek(topic: str, context_pebbles: list) -> Pebble:
    client = AsyncOpenAI(api_key=settings.DEEPSEEK_API_KEY, base_url=settings.DEEPSEEK_BASE_URL)
    prompt = _build_prompt(topic, context_pebbles)
    
    response = await client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "You output VALID JSON only."},
            {"role": "user", "content": prompt},
        ],
        response_format={ "type": "json_object" },
        temperature=1.3,
    )
    
    content_str = response.choices[0].message.content
    if content_str.startswith("```json"):
        content_str = content_str.replace("```json", "").replace("```", "")
        
    return _process_json_to_pebble(json.loads(content_str), topic)

async def _rewrite_with_deepseek(text: str, instruction: str) -> str:
    client = AsyncOpenAI(api_key=settings.DEEPSEEK_API_KEY, base_url=settings.DEEPSEEK_BASE_URL)
    response = await client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "You are an expert editor. Output ONLY the rewritten text."},
            {"role": "user", "content": f"Instruction: {instruction}\n\nOriginal: {text}"},
        ],
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()

# ==========================================
# 3. Gemini 实现 (增强修复版)
# ==========================================
async def _generate_with_gemini(topic: str, context_pebbles: list) -> Pebble:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    
    # 尝试不同的模型名称，防止版本差异
    model_candidates = ['gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro']
    model = None
    
    for model_name in model_candidates:
        try:
            model = genai.GenerativeModel(
                model_name,
                generation_config={"response_mime_type": "application/json"}
            )
            break
        except Exception:
            continue
            
    if not model:
        # 如果还没找到，回退到默认并去掉 json 配置（防止旧库报错）
        print("Warning: Could not configure JSON mode for Gemini 1.5. Falling back to default.")
        model = genai.GenerativeModel('gemini-pro')

    prompt = _build_prompt(topic, context_pebbles)
    
    try:
        response = await model.generate_content_async(prompt)
        text = response.text
        # 清理可能存在的 markdown (如果回退到了非 JSON 模式)
        if text.startswith("```json"):
            text = text.replace("```json", "").replace("```", "")
        return _process_json_to_pebble(json.loads(text), topic)
        
    except Exception as e:
        # ★★★ 调试：列出可用模型，方便排查 404 错误 ★★★
        print(f"\n--- GEMINI ERROR DEBUG ---")
        print(f"Error: {e}")
        try:
            print("Available models for your key:")
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    print(f"- {m.name}")
        except:
            print("Could not list models.")
        print(f"--------------------------\n")
        raise e

async def _rewrite_with_gemini(text: str, instruction: str) -> str:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    
    # ★★★ 修复：增加模型回退机制 (同 generate 函数) ★★★
    model_candidates = ['gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-pro']
    model = None
    
    for model_name in model_candidates:
        try:
            # 尝试初始化模型
            m = genai.GenerativeModel(model_name)
            # 这是一个轻量级检查，如果模型名不对，有些库版本会在调用时才报错
            # 但我们在下面 try-catch 调用 generate_content_async
            model = m
            break
        except Exception:
            continue
    
    # 如果没找到，兜底使用 gemini-pro
    if not model:
        model = genai.GenerativeModel('gemini-pro')

    prompt = f"""
    You are an expert editor. 
    Instruction: {instruction}
    
    Original Text:
    {text}
    
    Output ONLY the rewritten text. No preamble.
    """
    
    try:
        response = await model.generate_content_async(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini Rewrite Error: {e}")
        # 如果还是失败，抛出异常，但在日志里能看到具体原因
        raise e

# ==========================================
# 4. 主入口
# ==========================================
async def generate_pebble_logic(topic: str, context_pebbles: list) -> Pebble:
    provider = settings.AI_PROVIDER.lower()
    print(f"🌊 Generating using Provider: {provider.upper()}")
    
    try:
        if provider == 'deepseek':
            return await _generate_with_deepseek(topic, context_pebbles)
        else:
            return await _generate_with_gemini(topic, context_pebbles)
    except Exception as e:
        print(f"AI Generation Error ({provider}): {e}")
        raise e

async def rewrite_text_logic(text: str, mode: str) -> str:
    instructions = {
        "improve": "Rewrite to be more clear, professional, and engaging.",
        "shorter": "Summarize concisely. Remove fluff.",
        "longer": "Expand with more detail and context.",
        "simplify": "Explain like I'm 5 years old."
    }
    instruction = instructions.get(mode, instructions["improve"])
    
    provider = settings.AI_PROVIDER.lower()
    
    try:
        if provider == 'deepseek':
            return await _rewrite_with_deepseek(text, instruction)
        else:
            return await _rewrite_with_gemini(text, instruction)
    except Exception as e:
        print(f"Rewrite Error ({provider}): {e}")
        raise e