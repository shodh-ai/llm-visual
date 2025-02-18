import os
from dotenv import load_dotenv
import json
from app import app
import pytest

load_dotenv()

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index_route(client):
    """Test the main page loads correctly"""
    response = client.get('/')
    assert response.status_code == 200
    assert b'Database Schema Visualizer' in response.data

def test_get_schema(client):
    """Test schema retrieval"""
    response = client.get('/get_schema/ecommerce')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'tables' in data
    assert 'relationships' in data

def test_visualize_schema(client):
    """Test schema visualization"""
    response = client.post('/visualize_schema', 
                         json={'schema_name': 'ecommerce'})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'schema' in data
    assert 'visualization' in data

def test_narrate_table(client):
    """Test table narration"""
    response = client.post('/narrate_table', 
                         json={
                             'schema_name': 'ecommerce',
                             'table_name': 'users'
                         })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'text' in data
    assert 'audio_url' in data
