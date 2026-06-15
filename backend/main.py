from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import pytesseract
from PIL import Image
import io
import json

app = FastAPI(title="Anti-Scam API for Elderly")

# Configure CORS so the Next.js frontend can communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen2:1.5b" # Or "llama3"

# System Prompt specifically designed for elderly users (Few-shot prompting for 1.5b models)
SYSTEM_PROMPT = """你是一个充满耐心、语气温和的防诈骗助手，专门帮助老人家识别骗局。
不管收到什么信息，你的第一句话必须严格是【安全】或【危险】。

- 如果是普通问候（如“你好”、“在吗”、“吃饭没”）、家人朋友聊天、正常的系统通知，第一句话必须是【安全】。
- 如果涉及要求转账、中奖、冻结账户、要求点击【陌生链接】、或者要求拨打短信里的【陌生电话】，第一句话必须是【危险】。
- 特别注意：如果短信是银行发来的消费提醒，并且让用户“拨打银行卡背面的电话”（而不是短信里提供电话号码），这是【真实的银行安全提醒】，必须判断为【安全】。

示例 1：
需要分析的信息：你好
分析结论：
【安全】
爷爷奶奶，这只是一句普通的问候，非常安全，您可以放心回复。

示例 2：
需要分析的信息：您的账户已被冻结，请点击链接解冻
分析结论：
【危险】
爷爷奶奶，千万要注意！这是典型的诈骗套路！骗子经常冒充银行或客服发链接。千万不要点链接，也不要输入密码！

示例 3：
需要分析的信息：RM850.00 debited to MerchantX via Mastercard ending *1234. If this wasn't you, call the number on the back of your card immediately.
分析结论：
【安全】
爷爷奶奶，这是一条真实的银行消费提醒！因为短信里并没有让您点链接，也没有给您留假电话，而是让您拨打“银行卡背面的官方电话”。如果您没有这笔消费，请立刻找出您的实体银行卡，拨打卡背面的官方电话核实。

示例 4：
需要分析的信息：今晚回来吃饭吗？
分析结论：
【安全】
爷爷奶奶，这是正常的家常聊天，非常安全，您可以放心。
"""

class TextAnalyzeRequest(BaseModel):
    text: str

@app.post("/api/analyze/text")
async def analyze_text(request: TextAnalyzeRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    return await analyze_with_ollama(request.text)

@app.post("/api/analyze/image")
async def analyze_image(file: UploadFile = File(...)):
    try:
        # Read the uploaded image
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        # Use pytesseract to extract text from image
        # Note: requires tesseract installed on the system (`brew install tesseract` on Mac)
        # and chi_sim data for Chinese (`brew install tesseract-lang`)
        extracted_text = pytesseract.image_to_string(image, lang='chi_sim+eng')
        
        if not extracted_text.strip():
            return {
                "status": "error",
                "message": "未能从图片中识别出文字，请尝试重新截图或直接输入文字。"
            }
            
        # Analyze the extracted text
        analysis_result = await analyze_with_ollama(extracted_text)
        
        # Add the extracted text to the response for transparency
        analysis_result["extracted_text"] = extracted_text
        return analysis_result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import re

async def analyze_with_ollama(suspicious_text: str):
    # =====================================================================
    # 【核心系统升级】 混合双引擎架构 (Rules + AI)
    # 小模型 (1.5b) 容易产生幻觉，必须在系统层面对其进行约束和预判，这才是完整的“系统”。
    # =====================================================================
    
    text_lower = suspicious_text.lower()
    
    # 1. 危险特征提取 (提取链接)
    url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
    has_url = bool(url_pattern.search(text_lower))
    
    # 2. 绝对安全特征 (实体行为：骗子绝不敢让受害者去真实的物理网点)
    safe_physical_actions = [
        "前往邻近的", "前往附近", "分行", "柜台办理", "税务局分行", "派出所",
        "携带相关", "营业厅", "back of your card", "卡背面", "实体卡"
    ]
    
    # 规则 1: 如果包含实体行为要求，且没有附带危险网址，绝对是真实官方通知
    if any(kw in text_lower for kw in safe_physical_actions) and not has_url:
        return {
            "status": "success",
            "is_danger": False,
            "analysis": "爷爷奶奶，这是一条【真实的官方提醒】！\n\n系统分析：这条信息要求您【亲自前往官方实体机构】（如分行、柜台、税务局），或者拨打您【实体卡背面的官方电话】。骗子是绝对不敢让您去实体机构对质的。\n\n结论：请您放心，这不是诈骗。您可以带好相关证件，在工作时间前往官方机构处理。"
        }
        
    # 规则 2: 如果包含网址，且带有诱导性词汇，直接判定高危
    danger_keywords = ["中奖", "冻结", "涉嫌", "转账", "验证码", "免费领取"]
    if has_url and any(kw in text_lower for kw in danger_keywords):
         return {
            "status": "success",
            "is_danger": True,
            "analysis": "爷爷奶奶，这是典型的【钓鱼网址诈骗】！\n\n系统分析：信息中包含了一个不明链接，并且使用了“冻结/中奖/涉嫌违法”等词语来制造恐慌或诱惑。骗子就是想骗您点进这个链接输入密码或验证码。\n\n结论：千万不要点击链接！直接删除这条信息！"
        }

    # =====================================================================
    # 如果规则引擎无法确定，再交给 LLM 进行语义推理分析
    # =====================================================================
    prompt = f"{SYSTEM_PROMPT}\n\n需要分析的信息：\n{suspicious_text}\n\n分析结论：\n"
    
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.1 # Very low temperature for strict classification
        }
    }
    
    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        
        # Extract response text
        response_text = result.get("response", "").strip()
        
        # Robust logic to determine danger level based on the strict prefix
        # We check the first 20 characters to see if it classified it as dangerous
        is_danger = "【危险】" in response_text[:20] or "危险" in response_text[:20]
        
        # Clean up the prefix for the frontend so it reads naturally
        clean_analysis = response_text.replace("【危险】", "").replace("【安全】", "").strip()
        
        # Fallback if the small model only outputs the prefix without explanation
        if not clean_analysis:
            if is_danger:
                clean_analysis = "爷爷奶奶，这很可能是诈骗信息，千万不要转账，也不要点击里面的任何链接！"
            else:
                clean_analysis = "爷爷奶奶，这条信息看起来是正常的，没有发现明显的诈骗套路，您可以放心。"
        
        return {
            "status": "success",
            "is_danger": is_danger,
            "analysis": clean_analysis
        }
    except requests.exceptions.ConnectionError:
        return {
            "status": "error",
            "message": "无法连接到本地 AI 模型 (Ollama)。请确认 Ollama 正在运行并且已经下载了指定的模型。"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"AI 分析时出错：{str(e)}"
        }

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Anti-Scam API is running"}
