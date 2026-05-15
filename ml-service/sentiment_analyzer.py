import nltk
from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from nltk.corpus import stopwords
import re

# Download necessary NLTK data
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

analyzer = SentimentIntensityAnalyzer()
STOP_WORDS = set(stopwords.words('english'))

def clean_text(text):
    if not text: return ""
    text = text.lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    return text

def extract_keywords(text):
    words = clean_text(text).split()
    # Simple keyword extraction: remove stopwords and short words
    keywords = [w for w in words if w not in STOP_WORDS and len(w) > 3]
    return list(set(keywords))[:10] # Return top 10 unique keywords

def analyze_sentiment(text):
    if not text:
        return {"score": 0, "label": "neutral", "confidence": 0, "keywords": []}
    
    # 1. VADER analysis
    vader_scores = analyzer.polarity_scores(text)
    compound = vader_scores['compound']
    
    # 2. TextBlob analysis (for cross-validation)
    blob = TextBlob(text)
    polarity = blob.sentiment.polarity
    
    # Combined score
    combined_score = (compound + polarity) / 2
    
    # Determine label
    if combined_score >= 0.05:
        label = "positive"
    elif combined_score <= -0.05:
        label = "negative"
    else:
        label = "neutral"
        
    # Simple confidence based on intensity
    confidence = abs(combined_score) + 0.5
    if confidence > 1: confidence = 1.0
    
    return {
        "score": round(float(combined_score), 4),
        "label": label,
        "confidence": round(float(confidence), 4),
        "keywords": extract_keywords(text)
    }
