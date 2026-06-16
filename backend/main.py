from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import pytesseract
from PIL import Image
import io
import json
import re

app = FastAPI(title="Anti-Scam API for Everyone")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen2:1.5b" # Or "llama3"

SYSTEM_PROMPT_ZH = """你是一个充满耐心、语气专业的防诈骗助手，专门帮助用户识别骗局。
不管收到什么信息，你的第一句话必须严格是【安全】或【危险】。

- 如果是普通问候（如“你好”、“在吗”、“吃饭没”）、家人朋友聊天、正常的系统通知，第一句话必须是【安全】。
- 如果涉及要求转账、中奖、冻结账户、要求点击【陌生链接】、或者要求拨打短信里的【陌生电话】，第一句话必须是【危险】。
- 特别注意：如果短信是银行发来的消费提醒，并且让用户“拨打银行卡背面的电话”（而不是短信里提供电话号码），这是【真实的银行安全提醒】，必须判断为【安全】。

示例 1：
需要分析的信息：你好
分析结论：
【安全】
您好，这只是一句普通的问候，非常安全，您可以放心回复。

示例 2：
需要分析的信息：您的账户已被冻结，请点击链接解冻
分析结论：
【危险】
请千万注意！这是典型的诈骗套路！骗子经常冒充银行或客服发链接。千万不要点链接，也不要输入密码！
"""

SYSTEM_PROMPT_EN = """You are a professional and patient anti-scam assistant designed to help users identify scams.
Regardless of the message received, your very first word must strictly be either [SAFE] or [DANGER].

- If it's a normal greeting ("hello", "are you there", "did you eat"), family/friend chat, or a normal system notification, the first word must be [SAFE].
- If it involves requests for money transfers, winning a prize, account freezes, clicking [unfamiliar links], or calling an [unknown phone number] inside an SMS, the first word must be [DANGER].
- Special note: If an SMS is a bank transaction alert and tells the user to "call the number on the back of your card" (instead of providing a phone number in the text), this is a [real bank security alert], and must be judged as [SAFE].

Example 1:
Message to analyze: Hello
Analysis:
[SAFE]
Hello, this is just a normal greeting and is completely safe. You can reply with peace of mind.

Example 2:
Message to analyze: Your account is frozen, please click the link to unfreeze
Analysis:
[DANGER]
Please be extremely careful! This is a classic scam tactic! Scammers often pretend to be banks or customer service sending links. Never click the link or enter any passwords!
"""

class TextAnalyzeRequest(BaseModel):
    text: str
    language: str = "zh"

@app.post("/api/analyze/text")
async def analyze_text(request: TextAnalyzeRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    return await analyze_with_ollama(request.text, request.language)

@app.post("/api/analyze/image")
async def analyze_image(file: UploadFile = File(...), language: str = Form("zh")):
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        extracted_text = pytesseract.image_to_string(image, lang='chi_sim+eng')
        if not extracted_text.strip():
            error_msg = "未能从图片中识别出文字，请尝试重新截图或直接输入文字。" if language == "zh" else "Could not extract text from the image. Please try uploading a clearer image or type the text directly."
            return {"status": "error", "message": error_msg}
            
        analysis_result = await analyze_with_ollama(extracted_text, language)
        analysis_result["extracted_text"] = extracted_text
        return analysis_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def analyze_with_ollama(suspicious_text: str, language: str = "zh"):
    text_lower = suspicious_text.lower()
    url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
    has_url = bool(url_pattern.search(text_lower))
    
    safe_physical_actions_zh = ["前往邻近的", "前往附近", "分行", "柜台办理", "税务局分行", "派出所", "携带相关", "营业厅", "卡背面", "实体卡"]
    safe_physical_actions_en = ["branch", "counter", "tax office", "police station", "back of your card", "physical card"]
    safe_actions = safe_physical_actions_zh if language == "zh" else safe_physical_actions_en
    
    if any(kw in text_lower for kw in safe_actions) and not has_url:
        return {
            "status": "success",
            "is_danger": False,
            "analysis": "这是一条【真实的官方提醒】！\n\n系统分析：这条信息要求您亲自前往官方实体机构或拨打实体卡背面的官方电话。骗子绝不敢让您去实体机构。\n\n结论：请放心，这不是诈骗。" if language == "zh" else "This is a [real official alert]!\n\nSystem Analysis: The message asks you to go to a physical official location or call the number on the back of your card. Scammers never ask you to go to real physical branches.\n\nConclusion: Rest assured, this is not a scam."
        }
        
    danger_keywords_zh = ["中奖", "冻结", "涉嫌", "转账", "验证码", "免费领取"]
    danger_keywords_en = ["prize", "frozen", "suspected", "transfer", "otp", "verification code", "free gift", "claim"]
    danger_keywords = danger_keywords_zh if language == "zh" else danger_keywords_en
    
    if has_url and any(kw in text_lower for kw in danger_keywords):
         return {
            "status": "success",
            "is_danger": True,
            "analysis": "请注意，这是典型的【钓鱼网址诈骗】！\n\n系统分析：信息包含不明链接，并制造恐慌或诱惑。骗子想骗您输入密码或验证码。\n\n结论：千万不要点击链接！直接删除！" if language == "zh" else "Please note, this is a classic [Phishing Link Scam]!\n\nSystem Analysis: The message contains an unknown link and tries to create panic or temptation. Scammers want you to click and enter passwords.\n\nConclusion: NEVER click the link! Delete this immediately!"
        }

    system_prompt = SYSTEM_PROMPT_ZH if language == "zh" else SYSTEM_PROMPT_EN
    prompt = f"{system_prompt}\n\n需要分析的信息：\n{suspicious_text}\n\n分析结论：\n" if language == "zh" else f"{system_prompt}\n\nMessage to analyze:\n{suspicious_text}\n\nAnalysis:\n"
    
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1}
    }
    
    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        response_text = result.get("response", "").strip()
        
        is_danger = "【危险】" in response_text[:20] or "危险" in response_text[:20] or "[DANGER]" in response_text[:20].upper() or "DANGER" in response_text[:20].upper()
        
        clean_analysis = response_text.replace("【危险】", "").replace("【安全】", "").replace("[DANGER]", "").replace("[SAFE]", "").strip()
        
        if not clean_analysis:
            if is_danger:
                clean_analysis = "这很可能是诈骗信息，千万不要转账，也不要点击里面的任何链接！" if language == "zh" else "This is very likely a scam message. Do not transfer money and do not click any links!"
            else:
                clean_analysis = "这条信息看起来是正常的，没有发现明显的诈骗套路，您可以放心。" if language == "zh" else "This message looks normal. No obvious scam tactics were found. You can rest easy."
        
        return {
            "status": "success",
            "is_danger": is_danger,
            "analysis": clean_analysis
        }
    except requests.exceptions.ConnectionError:
        error_msg = "无法连接到本地 AI 模型 (Ollama)。请确认 Ollama 正在运行并且已经下载了指定的模型。" if language == "zh" else "Cannot connect to local AI model (Ollama). Please make sure Ollama is running."
        return {"status": "error", "message": error_msg}
    except Exception as e:
        error_msg = f"AI 分析时出错：{str(e)}" if language == "zh" else f"Error during AI analysis: {str(e)}"
        return {"status": "error", "message": error_msg}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Anti-Scam API is running"}
