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
SYSTEM_PROMPT = """You are a patient, gentle anti-scam assistant dedicated to helping elderly users identify scams.
Regardless of the message received, your first sentence MUST strictly be [SAFE] or [DANGER].

- If it's a normal greeting (e.g., "hello", "are you there", "have you eaten"), a chat from family/friends, or a normal system notification, your first sentence MUST be [SAFE].
- If it involves requesting money transfers, winning prizes, frozen accounts, clicking [UNKNOWN LINKS], or calling an [UNKNOWN NUMBER] from an SMS, your first sentence MUST be [DANGER].
- Special note: If an SMS is a bank transaction alert and tells the user to "call the number on the back of your card" (instead of providing a number in the SMS), this is a [REAL BANK SECURITY ALERT] and MUST be judged as [SAFE].

Example 1:
Message to analyze: Hello
Analysis:
[SAFE]
Grandpa/Grandma, this is just a normal greeting and is completely safe. You can reply with peace of mind.

Example 2:
Message to analyze: Your account has been frozen, please click the link to unfreeze
Analysis:
[DANGER]
Grandpa/Grandma, please be extremely careful! This is a classic scam tactic! Scammers often pretend to be banks or customer service sending links. Do not click the link and never enter your password!

Example 3:
Message to analyze: RM850.00 debited to MerchantX via Mastercard ending *1234. If this wasn't you, call the number on the back of your card immediately.
Analysis:
[SAFE]
Grandpa/Grandma, this is a real bank transaction alert! Because the SMS didn't ask you to click a link or give you a fake number, but rather asked you to call "the official number on the back of your bank card". If you didn't make this purchase, please immediately find your physical bank card and call the official number on the back to verify.

Example 4:
Message to analyze: Are you coming back for dinner tonight?
Analysis:
[SAFE]
Grandpa/Grandma, this is normal daily chat. It is very safe, please don't worry.
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
                "message": "Failed to extract text from the image. Please try retaking the screenshot or typing the text directly."
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
            "analysis": "Grandpa/Grandma, this is a [REAL OFFICIAL ALERT]!\n\nSystem Analysis: This message requires you to [PERSONALLY GO TO AN OFFICIAL PHYSICAL LOCATION] (like a branch, counter, or tax office), or call the [OFFICIAL NUMBER ON THE BACK OF YOUR PHYSICAL CARD]. Scammers will never dare to ask you to go to a physical institution to confront them.\n\nConclusion: Please rest assured, this is not a scam. You can bring your ID and go to the official institution during business hours to handle it."
        }
        
    # 规则 2: 如果包含网址，且带有诱导性词汇，直接判定高危
    danger_keywords = ["中奖", "冻结", "涉嫌", "转账", "验证码", "免费领取"]
    if has_url and any(kw in text_lower for kw in danger_keywords):
         return {
            "status": "success",
            "is_danger": True,
            "analysis": "Grandpa/Grandma, this is a classic [PHISHING LINK SCAM]!\n\nSystem Analysis: The message contains an unknown link and uses words like \"frozen/prize/illegal\" to create panic or temptation. Scammers want to trick you into clicking this link and entering your password or verification code.\n\nConclusion: NEVER click the link! Delete this message immediately!"
        }

    # =====================================================================
    # 如果规则引擎无法确定，再交给 LLM 进行语义推理分析
    # =====================================================================
    prompt = f"{SYSTEM_PROMPT}\n\nMessage to analyze:\n{suspicious_text}\n\nAnalysis:\n"
    
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
        is_danger = "[DANGER]" in response_text[:20] or "DANGER" in response_text[:20]
        
        # Clean up the prefix for the frontend so it reads naturally
        clean_analysis = response_text.replace("[DANGER]", "").replace("[SAFE]", "").strip()
        
        # Fallback if the small model only outputs the prefix without explanation
        if not clean_analysis:
            if is_danger:
                clean_analysis = "Grandpa/Grandma, this is highly likely a scam message. Do not transfer money and do not click any links inside!"
            else:
                clean_analysis = "Grandpa/Grandma, this message looks normal. No obvious scam tactics were found, so you can rest assured."
        
        return {
            "status": "success",
            "is_danger": is_danger,
            "analysis": clean_analysis
        }
    except requests.exceptions.ConnectionError:
        return {
            "status": "error",
            "message": "Unable to connect to the local AI model (Ollama). Please make sure Ollama is running and the specified model is downloaded."
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error during AI analysis: {str(e)}"
        }

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Anti-Scam API is running"}
