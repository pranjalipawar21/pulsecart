from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from sentiment_analyzer import analyze_sentiment
import uvicorn

app = FastAPI(title="PulseCart Sentiment API")

class ReviewRequest(BaseModel):
    id: int
    text: str

class BulkRequest(BaseModel):
    reviews: List[ReviewRequest]

class SingleRequest(BaseModel):
    text: str

@app.get("/")
def home():
    return {"status": "ok", "service": "PulseCart Sentiment Engine"}

@app.post("/analyze-live")
def analyze_single(req: SingleRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    return analyze_sentiment(req.text)

@app.post("/analyze-bulk")
def analyze_bulk(req: BulkRequest):
    results = []
    for r in req.reviews:
        analysis = analyze_sentiment(r.text)
        results.append({
            "review_id": r.id,
            **analysis
        })
    return {"success": True, "results": results}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
