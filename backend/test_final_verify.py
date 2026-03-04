import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.nlp import nlp_engine, model, util
import numpy as np

test_queries = [
    "Comment obtenir un passeport ?",
    "Ahoana ny fomba fahazoana pasipaoro?",
    "Ahoana ny fanaovana acte de mariage?",
    "Ahoana ny fangalana acte de décés?",
    "Ahoana ny fomba fangalana ny karapanondro?"
]

for q in test_queries:
    lang = "fr" if "?" in q and "Comment" in q else "mg"
    print(f"\n--- Testing: {q} ({lang}) ---")
    ans = nlp_engine.get_answer(q, lang)
    print(f"Answer Start: {ans[:200]}...")
