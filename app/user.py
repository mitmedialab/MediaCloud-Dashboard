import hashlib

from flask_login import UserMixin, AnonymousUserMixin

from app import db, mc

# User class
class User(UserMixin):
    def __init__(self, name, id, active=True):
        self.name = name
        self.id = id
        self.active = active
        
    def is_active(self):
        return self.active
    
    def is_anonymous(self):
        return False
    
    def is_authenticated(self):
        return True

def authenticate_user(username, password):
    try:
        key = mc.userAuthToken(username, password)
        return User(username, key)
    except Exception:
        return AnonymousUserMixin()

