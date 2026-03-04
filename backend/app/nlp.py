import json
import os
from sentence_transformers import SentenceTransformer, util
import numpy as np

# Adjust BASE_DIR to the root of 'chatbot' since the JSONs are there
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load JSON Data
def load_json(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return []

# Find JSON Data (Check current dir and parent)
def find_data_file(filename):
    # Check current dir (for local dev in 'backend')
    curr_path = os.path.join(os.getcwd(), filename)
    if os.path.exists(curr_path):
        return curr_path
    # Check 'backend' subdir (standard structure)
    backend_path = os.path.join(os.getcwd(), "backend", filename)
    if os.path.exists(backend_path):
        return backend_path
    # Fallback to absolute BASE_DIR
    return os.path.join(BASE_DIR, filename)

FR_DATA_PATH = find_data_file("all_chunks.json")
MG_DATA_PATH = find_data_file("services_mg_complete.json")

fr_data = load_json(FR_DATA_PATH)
mg_data = load_json(MG_DATA_PATH)

print(f"Loaded {len(fr_data)} chunks for French.")
print(f"Loaded {len(mg_data)} chunks for Malagasy.")

# Initialize the lightweight local NLP model
# 'all-MiniLM-L6-v2' is very fast, free, and runs well on CPU for sentence similarity
# 'paraphrase-multilingual-MiniLM-L12-v2' supports 50+ languages including French and Malagasy
MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2'
model = SentenceTransformer(MODEL_NAME)

class NLPService:
    def __init__(self, data_fr, data_mg):
        self.raw_fr = data_fr
        self.raw_mg = data_mg
        
        # Aggregate by URL for response generation
        self.agg_fr = self._aggregate_data(data_fr, "page_url")
        self.agg_mg = self._aggregate_data(data_mg, "url")
        
        # Expose model and numpy for debugging if needed
        self.model = model
        self.np = np
        
        # Precompute dual embeddings (Title/URL vs Descriptions)
        self.fr_title_embs = None
        self.fr_desc_embs = None
        self.mg_title_embs = None
        self.mg_desc_embs = None
        self._prepare_embeddings()

    def _aggregate_data(self, data, url_key):
        aggregated = {}
        for item in data:
            if not isinstance(item, dict): continue
            url = item.get(url_key)
            if not url: continue
            
            if url not in aggregated:
                aggregated[url] = {
                    "url": url,
                    "title": item.get("service_title", item.get("title", "")),
                    "description": item.get("description", ""),
                    "text": "",
                    "etapes": item.get("etapes", []),
                    "documents_requis": item.get("documents_requis", []),
                    "frais_service": item.get("frais_service", ""),
                    "full_content": ""
                }
            
            entry = aggregated[url]
            if "text" in item:
                if item.get("tag") == "full":
                    entry["full_content"] = item["text"]
                else:
                    entry["text"] += f"\n{item['text']}"
            
            if "description" in item and item["description"] and not entry["description"]:
                entry["description"] = item["description"]
            
            for list_key in ["etapes", "documents_requis"]:
                if list_key in item and isinstance(item[list_key], list):
                    for val in item[list_key]:
                        if val not in entry[list_key]:
                            entry[list_key].append(val)
            
            if "frais_service" in item and item["frais_service"] and not entry["frais_service"]:
                entry["frais_service"] = item["frais_service"]
        return aggregated

    def _prepare_embeddings(self):
        print("Precomputing dual embeddings...")
        
        # French
        fr_titles = [f"{item.get('service_title', '')} {item.get('page_url', '')}" for item in self.raw_fr]
        fr_descs = [item.get("text", "") for item in self.raw_fr]
        self.fr_title_embs = model.encode(fr_titles, convert_to_tensor=True)
        self.fr_desc_embs = model.encode(fr_descs, convert_to_tensor=True)
            
        # Malagasy
        mg_titles = [f"{item.get('title', '')} {item.get('url', '')}" for item in self.raw_mg]
        mg_descs = [item.get("description", "") for item in self.raw_mg]
        self.mg_title_embs = model.encode(mg_titles, convert_to_tensor=True)
        self.mg_desc_embs = model.encode(mg_descs, convert_to_tensor=True)
        
        print("Embeddings ready.")

    def _normalize(self, text: str):
        """Simple normalization to remove accents for better keyword matching."""
        import unicodedata
        return "".join(c for c in unicodedata.normalize('NFD', text)
                      if unicodedata.category(c) != 'Mn').lower()

    def _get_keyword_boost(self, query: str, data_item: dict):
        """Returns a boost factor if high-intent keywords match the item significantly."""
        q_norm = self._normalize(query)
        title_norm = self._normalize(data_item.get("title", data_item.get("service_title", "")))
        url_norm = data_item.get("url", data_item.get("page_url", "")).lower() # URL is already ASCII-ish
        
        # Define intent keywords (normalized)
        intents = {
            "mariage": ["mariage", "panambadiana", "tsoram-panambadiana", "maridage"],
            "deces": ["dece", "pahafatesana", "maty", "tsoram-pahafatesana", "fahalasanana"],
            "naissance": ["naissance", "fahaterahana", "tsoram-paniterahana", "nena"],
            "passeport": ["passeport", "pasipaoro", "pasiporo"],
            "cni": ["cni", "karapanondro", "carte nationale"],
            "casier": ["casier", "heloka bevava", "bulletin n"]
        }
        
        boost = 0.0
        for intent, patterns in intents.items():
            if any(p in q_norm for p in patterns):
                # Strong match if intent keyword is in title or URL
                if any(p in title_norm or p in url_norm for p in patterns):
                    boost += 0.5 # Increased boost
                # Soft match if intent keyword is in description but not in query's primary intent?
                # Actually, if query has the keyword, and title has it, it's a very strong signal.
        return boost

    def get_answer(self, query: str, language: str = "fr") -> str:
        raw_data = self.raw_fr if language == "fr" else self.raw_mg
        agg_data = self.agg_fr if language == "fr" else self.agg_mg
        title_embs = self.fr_title_embs if language == "fr" else self.mg_title_embs
        desc_embs = self.fr_desc_embs if language == "fr" else self.mg_desc_embs
        url_key = "page_url" if language == "fr" else "url"

        if not raw_data or title_embs is None:
            return "Internal Error: Knowledge base not loaded."

        query_emb = model.encode(query, convert_to_tensor=True)
        
        # Search in both title and description
        title_scores = util.cos_sim(query_emb, title_embs)[0].cpu().numpy()
        desc_scores = util.cos_sim(query_emb, desc_embs)[0].cpu().numpy()
        
        # combine scores
        # combine scores: For Malagasy, titles are MUCH more reliable than long descriptions
        if language == "mg":
            final_scores = (title_scores * 3.0 + desc_scores) / 4.0
        else:
            final_scores = (title_scores * 2.0 + desc_scores) / 3.0
        
        # Apply boosts
        for idx in range(len(final_scores)):
            final_scores[idx] += self._get_keyword_boost(query, raw_data[idx])
        
        top_idx = np.argmax(final_scores)
        highest_score = final_scores[top_idx]

        THRESHOLD = 0.35 
        
        if highest_score < THRESHOLD:
            if language == "fr":
                 return "Désolé, je ne connais pas la réponse. Je suis un assistant administratif Torolalana et je ne peux répondre qu'aux questions concernant nos services."
            else:
                 return "Azafady, tsy fantatro ny valiny. Mpanampy ho an'ny sampandraharaham-panjakana Torolalana aho ary tsy afaka mamaly afa-tsy izay mahakasika ny tolotray."

        best_chunk = raw_data[top_idx]
        url = best_chunk.get(url_key)
        
        if not url or url not in agg_data:
            return self._format_single_chunk(best_chunk, language)

        return self._format_aggregated(agg_data[url], language)

    def _format_single_chunk(self, item, language):
        title = item.get("service_title", item.get("title", "Info"))
        text = item.get("text", item.get("description", ""))
        return f"**{title}**\n\n{text}".strip()

    def _format_aggregated(self, best, language):
        if language == "fr":
            text = best["full_content"] if best["full_content"] else best["text"]
            title_prefix = f"**{best['title']}**\n\n" if best['title'] and best['title'] not in text else ""
            response = f"{title_prefix}{text}\n\n[En savoir plus]({best['url']})"
        else:
            response = f"**{best['title']}**\n\n"
            if best["description"]: response += f"{best['description']}\n\n"
            if best["etapes"]:
                response += "Dingana:\n" + "\n".join([f"- {e}" for e in best["etapes"]]) + "\n\n"
            if best["documents_requis"]:
                response += "Antontan-taratasy ilaina:\n"
                for doc in best["documents_requis"]:
                    if isinstance(doc, str): response += f"- {doc}\n"
                    elif isinstance(doc, dict) and "title" in doc:
                        response += f"- **{doc['title']}**\n"
                        if "items" in doc:
                            for item in doc["items"]: response += f"  * {item}\n"
                response += "\n"
            if best["frais_service"]: response += f"Sarany: {best['frais_service']}\n\n"
            response += f"[Hamantatra bebe kokoa]({best['url']})"
        return response.strip()

# Create a singleton instance
nlp_engine = NLPService(fr_data, mg_data)
