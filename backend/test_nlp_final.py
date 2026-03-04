from app.nlp import nlp_engine

queries = [
    ("Ahoana ny fangalana acte de décés?", "mg"),
    ("Ahoana ny fanaovana acte de mariage?", "mg"),
    ("Comment obtenir un passeport ?", "fr")
]

for q, lang in queries:
    print(f"\n--- Testing: {q} ({lang}) ---")
    try:
        # Access the underlying scores for debugging
        raw_data = nlp_engine.raw_fr if lang == "fr" else nlp_engine.raw_mg
        title_embs = nlp_engine.fr_title_embs if lang == "fr" else nlp_engine.mg_title_embs
        desc_embs = nlp_engine.fr_desc_embs if lang == "fr" else nlp_engine.mg_desc_embs
        
        query_emb = nlp_engine.model.encode(q, convert_to_tensor=True)
        from sentence_transformers import util
        t_scores = util.cos_sim(query_emb, title_embs)[0].cpu().numpy()
        d_scores = util.cos_sim(query_emb, desc_embs)[0].cpu().numpy()
        
        final_scores = (t_scores * 1.5 + d_scores) / 2.5
        for idx in range(len(final_scores)):
            final_scores[idx] += nlp_engine._get_keyword_boost(q, raw_data[idx])
            
        top_idx = nlp_engine.np.argmax(final_scores)
        best = raw_data[top_idx]
        print(f"Top Score: {final_scores[top_idx]:.4f}")
        print(f"Matched Title: {best.get('title', best.get('service_title', ''))}")
        print(f"Matched URL: {best.get('url', best.get('page_url', ''))}")
        
    except Exception as e:
        print(f"Debug Error: {e}")
        
    answer = nlp_engine.get_answer(q, lang)
    print("Answer (Snippet):")
    print(answer[:200] + "..." if len(answer) > 200 else answer)
