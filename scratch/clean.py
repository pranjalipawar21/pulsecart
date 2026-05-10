import re

with open('src/components/Sentiment.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Remove LLM/URL State
code = re.sub(r'const \[llmLoading[\s\S]*?useState\(null\);\n', '', code)
code = re.sub(r'const \[urlInput[\s\S]*?useState\(null\);\n', '', code)
code = re.sub(r'const \[aiCat[\s\S]*?useState\(null\);\n', '', code)

# 2. Remove functions (runLLMAnalysis to runGeminiAnalysis)
code = re.sub(r'// ── LLM second-pass analysis ──[\s\S]*?(// ── Computed stats ──)', r'\1', code)

# 3. Fix Grid layout
code = re.sub(
    r'\{/\* Live analyser \+ LLM second-pass \*/\}\s*<div style=\{\{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 \}\}>',
    '{/* Live analyser */}\n      <div style={{ marginBottom: 16 }}>',
    code
)

# 4. Change badge text
code = code.replace('Lexicon + LLM', 'Lexicon')

# 5. Remove LLM buttons and results from live analyzer
code = re.sub(r'\{liveText\.length > 5 && \([\s\S]*?\{llmResult\?\.error && \([\s\S]*?\}\)\n\s*</div>\n', '</div>\n', code)

# 6. Remove URL Pipeline
code = re.sub(r'\s*\{\/\* URL Pipeline \*\/\}([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* Gemini AI Category Analysis \*\/\}', '\n      </div>\n\n      {/* Gemini AI Category Analysis */}', code)

# 7. Remove Category Analysis
code = re.sub(r'\s*\{\/\* Gemini AI Category Analysis \*\/\}([\s\S]*?)<\/div>\s*\{\/\* Review table with filters \*\/\}', '\n\n      {/* Review table with filters */}', code)

with open('src/components/Sentiment.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Cleanup complete.")
