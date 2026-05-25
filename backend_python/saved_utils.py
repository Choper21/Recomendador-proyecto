import json
import os

SAVED_FILE = "saved_players.json"

def load_all_saved():
    if not os.path.exists(SAVED_FILE):
        return {}
    with open(SAVED_FILE, "r") as f:
        content = f.read().strip()
        if not content:
            return {}
        return json.loads(content)

def save_all_saved(data):
    with open(SAVED_FILE, "w") as f:
        json.dump(data, f, indent=2)

def get_saved_players(username):
    data = load_all_saved()
    return data.get(username, [])

def add_saved_player(username, player_name):
    data = load_all_saved()
    if username not in data:
        data[username] = []
    if player_name not in data[username]:
        data[username].append(player_name)
        save_all_saved(data)
        return True
    return False

def remove_saved_player(username, player_name):
    data = load_all_saved()
    if username in data and player_name in data[username]:
        data[username].remove(player_name)
        if not data[username]:
            del data[username]
        save_all_saved(data)
        return True
    return False