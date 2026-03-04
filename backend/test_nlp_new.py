from app.nlp import nlp_engine

queries = [
    ("Comment obtenir un passeport ?", "fr"),
    ("Ahoana ny fomba fahazoana pasipaoro ?", "mg"),
    ("Ahoana ny fanaovana acte de mariage?", "mg")
]

for q, lang in queries:
    print(f"\n--- Testing: {q} ({lang}) ---")
    answer = nlp_engine.get_answer(q, lang)
    print(answer[:500] + "..." if len(answer) > 500 else answer)
