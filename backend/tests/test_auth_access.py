import asyncio
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.models.entities import User
from app.api.endpoints.auth import register_user, get_current_user
from app.schemas.dtos import UserRegisterRequest
from app.core.security import create_access_token, decode_access_token


def test_registration_cannot_self_provision_admin():
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine)() as db:
        result = register_user(UserRegisterRequest(email='x@example.edu', username='test', password='secret123', full_name='Test User', role='ADMIN'), db)
        assert result.user.role == 'FACULTY'


def test_malformed_subject_is_unauthorized():
    with pytest.raises(HTTPException) as error:
        asyncio.run(get_current_user('Bearer ' + create_access_token({'sub': 'bad'}), None))
    assert error.value.status_code == 401


def test_expired_and_invalid_subject_tokens_rejected():
    assert decode_access_token(create_access_token({'sub': '1'}, expires_delta_seconds=-1)) is None
    assert decode_access_token(create_access_token({'sub': []})) is None

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from app.api.endpoints import auth, subjects
from app.db.session import get_db
from app.models.access import SubjectMembership
from app.models.entities import Subject
from app.core.security import hash_password

@pytest.fixture
def access_client():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    with factory() as db:
        db.add_all([User(id=1,email='admin@test.edu',username='administrator',full_name='Admin',role='ADMIN',hashed_password=hash_password('private123'),is_active=1), User(id=2,email='faculty@test.edu',username='lecturer',full_name='Faculty',role='FACULTY',hashed_password=hash_password('private123'),is_active=1), Subject(id=1,code='CS1',name='Algorithms',department='CS',semester=1),Subject(id=2,code='CS2',name='Networks',department='CS',semester=2)])
        db.add(SubjectMembership(user_id=2,subject_id=1)); db.commit()
    app = FastAPI()
    app.include_router(auth.router)
    app.include_router(subjects.router)
    def database():
        with factory() as db:
            yield db
    app.dependency_overrides[get_db] = database
    with TestClient(app) as client:
        yield client, factory
    engine.dispose()

def bearer(user_id):
    return {'Authorization': 'Bearer ' + create_access_token({'sub': str(user_id)})}

def test_auth_and_scoped_course_reads(access_client):
    client, _ = access_client
    assert client.get('/subjects').status_code == 401
    assert [s['id'] for s in client.get('/subjects',headers=bearer(2)).json()] == [1]
    assert client.get('/subjects/2',headers=bearer(2)).status_code == 403
    assert len(client.get('/subjects',headers=bearer(1)).json()) == 2
    assert client.delete('/subjects/1',headers=bearer(2)).status_code == 403

def test_admin_assignment_and_self_demotion_guard(access_client):
    client, _ = access_client
    assert client.put('/auth/users/2/subjects',headers=bearer(2),json={'subject_ids':[2]}).status_code == 403
    assert client.put('/auth/users/2/subjects',headers=bearer(1),json={'subject_ids':[2,2]}).json() == [2]
    assert [s['id'] for s in client.get('/subjects',headers=bearer(2)).json()] == [2]
    assert client.put('/auth/users/2/subjects',headers=bearer(1),json={'subject_ids':[999]}).status_code == 422
    assert client.get('/auth/users/2/subjects',headers=bearer(1)).json() == [2]
    assert client.put('/auth/users/1/status',headers=bearer(1),json={'role':'FACULTY'}).status_code == 400

def test_admin_provisioning_keeps_caller_and_no_automatic_membership(access_client):
    client, _ = access_client
    payload=dict(email='new@test.edu',username='newadmin',password='private123',full_name='New Admin',role='ADMIN')
    assert client.post('/auth/users',headers=bearer(2),json=payload).status_code == 403
    result=client.post('/auth/users',headers=bearer(1),json=payload)
    assert result.status_code == 201 and result.json()['role']=='ADMIN'
    assert 'access_token' not in result.json()
    assert client.get('/auth/users/'+str(result.json()['id'])+'/subjects',headers=bearer(1)).json() == []

def test_non_demo_seed_disables_only_unchanged_published_passwords(access_client, monkeypatch):
    from app.db.seed_data import seed_users
    from app.core.config import settings
    client, factory = access_client
    monkeypatch.setattr(settings,'DEMO_MODE',False)
    with factory() as db:
        db.add_all([User(email='admin@university.edu',username='admin',full_name='Seed Admin',role='ADMIN',hashed_password=hash_password('admin123'),is_active=1),User(email='faculty@university.edu',username='faculty',full_name='Changed Faculty',role='FACULTY',hashed_password=hash_password('changed-private'),is_active=1)])
        db.commit();seed_users(db)
        assert not db.query(User).filter_by(username='admin').one().is_active
        assert db.query(User).filter_by(username='faculty').one().is_active
        assert db.query(User).filter_by(username='shubh').first() is None

def test_memberships_removed_when_course_deleted(access_client):
    client, factory = access_client
    assert client.delete('/subjects/1',headers=bearer(1)).status_code == 204
    with factory() as db:
        assert db.query(SubjectMembership).filter_by(subject_id=1).count() == 0

def test_invalid_bearer_forms_fail_closed(access_client):
    client, _ = access_client
    token = create_access_token({'sub':'2'})
    for value in [token, 'Basic '+token, 'Bearer junk', 'Bearer '+create_access_token({'sub':'-1'}), 'Bearer '+create_access_token({'sub':'1.0'})]:
        assert client.get('/auth/me', headers={'Authorization':value}).status_code == 401
