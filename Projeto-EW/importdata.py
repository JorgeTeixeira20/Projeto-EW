import json
import os
from pymongo import MongoClient

# Conexão ao MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['recursosEducativos']

def import_data():
    # Carregar o arquivo JSON
    with open('./data/dataset.json', 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    # Remover coleções existentes
    db.drop_collection('users')
    db.drop_collection('resources')
    db.drop_collection('posts')

    # Importar usuários
    if 'users' in data:
        users_collection = db['users']
        users_collection.insert_many(data['users'])
        print(f'{len(data["users"])} usuários importados.')

    # Importar recursos
    if 'resources' in data:
        resources_collection = db['resources']
        resources_collection.insert_many(data['resources'])
        print(f'{len(data["resources"])} recursos importados.')

    # Importar posts
    if 'posts' in data:
        posts_collection = db['posts']
        posts_collection.insert_many(data['posts'])
        print(f'{len(data["posts"])} posts importados.')

if __name__ == '__main__':
    import_data()
