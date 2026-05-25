import json
from datetime import datetime

LOG_FILE = "interacciones.log"

def log_interaction(username: str, search_query: str, searched_player: str, results: list):
    entry = {
        "timestamp": datetime.now().isoformat(),
        "user": username,
        "search_query": search_query,
        "searched_player": searched_player,
        "results": results
    }
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")