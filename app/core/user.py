import hashlib
import datetime

from flask_login import UserMixin, AnonymousUserMixin

from app.core import db, mc

# User class
class User(UserMixin):
    def __init__(self, name, userid, active=True):
        self.name = name
        self.id = userid
        self.active = active
        self.created = datetime.datetime.now()
        
    def is_active(self):
        return self.active
    
    def is_anonymous(self):
        return False
    
    def is_authenticated(self):
        return True
    
    @classmethod
    def get(cls, userid):
        try:
            return User.cached[userid]
        except KeyError:
            return None
User.cached = {}

def authenticate_user_key(username, key):
    try:
        user = User(username, key)
        User.cached[key] = user
        # Invalidate if over 10 minutes old
        if datetime.datetime.now() - user.created > datetime.timedelta(minutes=10):
            del User.cached[key]
            return AnonymousUserMixin()
        return user
    except Exception:
        return AnonymousUserMixin()
        

def authenticate_user(username, password):
    try:
        key = mc.userAuthToken(username, password)
        user = User(username, key)
        User.cached[key] = user
        return user
    except Exception:
        return AnonymousUserMixin()

