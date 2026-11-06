import os, sys, tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
os.environ['DATABASE_URL']='sqlite:///'+str(Path(tempfile.mkdtemp())/'test.db').replace('\\','/')
os.environ['JWT_SECRET']='test-only-secret-not-used-in-deployments-123456'
os.environ['DEMO_MODE']='true'
import pytest
from fastapi.testclient import TestClient
from app import app
@pytest.fixture
def client():
    with TestClient(app) as c: yield c
@pytest.fixture
def authenticated(client):
    assert client.post('/api/auth/demo').status_code==200
    return client
