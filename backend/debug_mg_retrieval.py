import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.nlp import nlp_engine, model, util
import numpy as np

queries = [
    "pasipaoro",
    "fahaterahana",
    "karapanondro",
    "panambadiana",
    "fahafatesana",
    "fahasalamana"
]

def debug_query(q):
    print(f"\nQUERY: {q}")
    q_emb = model.encode(q, convert_to_tensor=True)
    
    t_scores = util.cos_sim(q_emb, nlp_engine.mg_title_embs)[0].cpu().numpy()
    d_scores = util.cos_sim(q_emb, nlp_engine.mg_desc_embs)[0].cpu().numpy()
    
    final_scores = (t_scores * 1.5 + d_scores) / 2.5
    
    results = []
    for idx in range(len(final_scores)):
        boost = nlp_engine._get_keyword_boost(q, nlp_engine.raw_mg[idx])
        score = final_scores[idx] + boost
        results.append({
            "idx": idx,
            "title": nlp_engine.raw_mg[idx].get("title"),
            "url": nlp_engine.raw_mg[idx].get("url"),
            "t_score": t_scores[idx],
            "d_score": d_scores[idx],
            "boost": boost,
            "final": score
        })
    
    results.sort(key=lambda x: x["final"], reverse=True)
    
    for i in range(min(5, len(results))):
        r = results[i]
        print(f"{i+1}. [{r['final']:.4f}] {r['title']}")
        print(f"   T:{r['t_score']:.3f} D:{r['d_score']:.3f} B:{r['boost']:.3f}")
        print(f"   URL: {r['url']}")

for q in queries:
    debug_query(q)
