import json
import os
from sentence_transformers import SentenceTransformer, util
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FR_DATA_PATH = os.path.join(BASE_DIR, "all_chunks.json")
MG_DATA_PATH = os.path.join(BASE_DIR, "services_mg_complete.json")

def load_json(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return []

fr_data = load_json(FR_DATA_PATH)
mg_data = load_json(MG_DATA_PATH)

MODEL_NAME = 'all-MiniLM-L6-v2'
model = SentenceTransformer(MODEL_NAME)

class DebugNLP:
    def __init__(self, data_fr, data_mg):
        self.raw_fr = data_fr
        self.raw_mg = data_mg
        self.agg_fr = self._aggregate_data(data_fr, "page_url")
        self.agg_mg = self._aggregate_data(data_mg, "url")
        self.fr_corpus = list(self.agg_fr.values())
        self.mg_corpus = list(self.agg_mg.values())
        self.fr_embeddings = model.encode([f"{e.get('service_title', e.get('title', ''))} {e.get('text', '')} {e.get('page_url', '')}".strip() for e in self.raw_fr], convert_to_tensor=True)
        self.mg_embeddings = model.encode([f"{e.get('title', '')} {e.get('description', '')} {e.get('url', '')}".strip() for e in self.raw_mg], convert_to_tensor=True)

    def _aggregate_data(self, data, url_key):
        aggregated = {}
        for item in data:
            url = item.get(url_key)
            if not url: continue
            if url not in aggregated:
                aggregated[url] = {"title": item.get("service_title", item.get("title", "")), "description": item.get("description", ""), "text": "", "url": url}
            if "text" in item: aggregated[url]["text"] += " " + item["text"]
        return aggregated

    def debug_query(self, query, language="fr"):
        raw = self.raw_fr if language == "fr" else self.raw_mg
        embeddings = self.fr_embeddings if language == "fr" else self.mg_embeddings
        query_emb = model.encode(query, convert_to_tensor=True)
        cos_scores = util.cos_sim(query_emb, embeddings)[0]
        top_results = np.argsort(-cos_scores.cpu().numpy())[:5]
        
        print(f"\nQuery: {query} (Language: {language})")
        for idx in top_results:
            score = cos_scores[idx].item()
            entry = raw[idx]
            print(f"Score: {score:.4f} | Title: {entry.get('title', entry.get('service_title', ''))} | URL: {entry.get('url', entry.get('page_url', ''))}")

debug = DebugNLP(fr_data, mg_data)
debug.debug_query("Ahoana ny fanaovana acte de mariage?", "mg")
debug.debug_query("Ahoana ny fangalana acte de décés?", "mg")
debug.debug_query("raki-tsoram-pahafatesana", "mg")
debug.debug_query("deces", "mg")
