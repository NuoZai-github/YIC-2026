from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import pytesseract
from PIL import Image
import io
import json
import re
import sqlite3
import os
import difflib

app = FastAPI(title="Smart Shield API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3" # Upgraded for better reasoning
DB_PATH = "feedback.db"

# ================= DB Init =================
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_text TEXT,
            expected_is_danger BOOLEAN,
            correction_text TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()
# ============================================

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

class FeedbackRequest(BaseModel):
    original_text: str
    expected_is_danger: bool
    correction_text: str
    password: str

@app.post("/api/feedback")
async def submit_feedback(request: FeedbackRequest):
    if request.password != "yic2026":
        raise HTTPException(status_code=403, detail="管理员密码错误，无法提交纠错记录。(Incorrect admin password)")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO feedback (original_text, expected_is_danger, correction_text)
            VALUES (?, ?, ?)
        ''', (request.original_text, request.expected_is_danger, request.correction_text))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Feedback saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

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

def get_recent_feedbacks():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT original_text, expected_is_danger, correction_text FROM feedback ORDER BY timestamp DESC LIMIT 3')
        results = cursor.fetchall()
        conn.close()
        return results
    except:
        return []

def check_fuzzy_feedback_match(text: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT expected_is_danger, correction_text, original_text FROM feedback ORDER BY timestamp DESC')
        results = cursor.fetchall()
        conn.close()
        
        for expected_is_danger, correction_text, original_text in results:
            # 使用 difflib 计算相似度 (Ratio)
            similarity = difflib.SequenceMatcher(None, text.lower().strip(), original_text.lower().strip()).ratio()
            if similarity > 0.85: # 只要相似度大于 85%（比如只换了单号），就认定为命中
                return (expected_is_danger, correction_text)
        return None
    except:
        return None

async def analyze_with_ollama(suspicious_text: str, language: str = "zh"):
    text_lower = suspicious_text.lower().strip()
    system_prompt = SYSTEM_PROMPT_ZH if language == "zh" else SYSTEM_PROMPT_EN
    
    # ================= 铁律架构升级：让大模型润色管理员指令 =================
    fuzzy_match = check_fuzzy_feedback_match(text_lower)
    if fuzzy_match:
        is_danger_val = bool(fuzzy_match[0])
        danger_str = "【危险】" if is_danger_val else "【安全】"
        en_danger_str = "[DANGER]" if is_danger_val else "[SAFE]"
        
        hint_zh = f"\n\n【系统最高指令】：经底层数据库校验，该信息已被管理员明确标记为 {danger_str}。管理员给出的核心理由是：'{fuzzy_match[1]}'。请你绝对服从该判断，第一句话输出 {danger_str}，然后用你专业、耐心的客服语气，把管理员的理由润色扩充成一段完美的分析报告给用户。"
        hint_en = f"\n\n[SYSTEM HIGHEST DIRECTIVE]: Based on the database, this message has been verified by the Admin as {en_danger_str}. The core reason is: '{fuzzy_match[1]}'. You MUST output the conclusion as {en_danger_str}, and then use your professional and patient tone to expand and rewrite the Admin's reason into a perfect analysis report for the user."
        system_prompt += hint_zh if language == "zh" else hint_en
    else:
        # 如果没有命中记忆，才执行常规模糊判断
        url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
        has_url = bool(url_pattern.search(text_lower))
        
        safe_physical_actions_zh = ["前往邻近的", "前往附近", "分行", "柜台办理", "税务局分行", "派出所", "携带相关", "营业厅", "卡背面", "实体卡"]
        safe_physical_actions_en = ["branch", "counter", "tax office", "police station", "back of your card", "physical card"]
        safe_actions = safe_physical_actions_zh if language == "zh" else safe_physical_actions_en
        
        if any(kw in text_lower for kw in safe_actions) and not has_url:
            hint_zh = "\n\n【系统强制提示】：由于信息中要求用户亲自前往线下实体机构（如分行、柜台等），这通常是真实的官方机构。骗子不敢让用户线下见面。请务必判断为【安全】，并结合对方发送的具体信息（如快递公司、银行名），向用户解释为什么去实体机构是安全的。"
            hint_en = "\n\n[SYSTEM FORCE HINT]: Because the message asks the user to physically go to an official location (e.g., branch, counter), this is usually a real official entity. Scammers avoid physical meetings. Please strictly judge this as [SAFE] and explain this logic to the user based on the specific context of their message."
            system_prompt += hint_zh if language == "zh" else hint_en
            
        danger_keywords_zh = ["中奖", "冻结", "涉嫌", "转账", "验证码", "免费领取"]
        danger_keywords_en = ["prize", "frozen", "suspected", "transfer", "otp", "verification code", "free gift", "claim"]
        danger_keywords = danger_keywords_zh if language == "zh" else danger_keywords_en
        
        if has_url and any(kw in text_lower for kw in danger_keywords):
            hint_zh = "\n\n【系统强制提示】：由于信息中包含不明链接，并且涉及敏感词汇，这是典型的钓鱼链接诈骗。请务必判断为【危险】，并结合对方发送的具体信息，向用户详细分析其中的风险漏洞。"
            hint_en = "\n\n[SYSTEM FORCE HINT]: Because the message contains an unknown link and sensitive keywords, this is a classic phishing scam. Please strictly judge this as [DANGER] and explain the specific risk to the user based on their message."
            system_prompt += hint_zh if language == "zh" else hint_en
        
        # ================= 注入历史错题 (Data Flywheel) =================
        recent_feedbacks = get_recent_feedbacks()
        if recent_feedbacks:
            if language == "zh":
                feedback_prompt = "\n\n以下是过去的最新经验教训示例（极其重要），请务必学习参考：\n"
                for i, fb in enumerate(recent_feedbacks):
                    danger_str = "【危险】" if fb[1] else "【安全】"
                    feedback_prompt += f"新经验 {i+1}：\n需要分析的信息：{fb[0]}\n分析结论：\n{danger_str}\n{fb[2]}\n\n"
            else:
                feedback_prompt = "\n\nHere are recent critical examples you learned from past mistakes. Please absolutely refer to them:\n"
                for i, fb in enumerate(recent_feedbacks):
                    danger_str = "[DANGER]" if fb[1] else "[SAFE]"
                    feedback_prompt += f"New Experience {i+1}:\nMessage to analyze: {fb[0]}\nAnalysis:\n{danger_str}\n{fb[2]}\n\n"
            system_prompt += feedback_prompt
        # ==============================================================

    prompt = f"{system_prompt}\n\n需要分析的信息：\n{suspicious_text}\n\n分析结论：\n" if language == "zh" else f"{system_prompt}\n\nMessage to analyze:\n{suspicious_text}\n\nAnalysis:\n"
    
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1}
    }
    
    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=60)
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
