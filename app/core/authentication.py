import hashlib
import datetime

from flask_login import UserMixin, AnonymousUserMixin
import mediacloud as mcapi

import app
from app.core import db, mc


# User class
class User(UserMixin):
    def __init__(self, username, key, active=True, profile=None):
        self.name = username
        self.id = key
        self.key = key
        self.active = active
        self.created = datetime.datetime.now()
        self.profile = profile
        
    def is_active(self):
        return self.active
    
    def is_anonymous(self):
        return False
    
    def is_authenticated(self):
        return True

    def get_key(self):
        return self.key

    def create_in_db_if_needed(self):
        if self.exists_in_db():
            app.core.logger.debug("  user %s already in db" % self.name)
            return
        app.core.logger.debug("  user %s created in db" % self.name)
        db.users.insert({'username':self.name})

    def exists_in_db(self):
        return db.users.find_one({'username':self.name}) is not None
    
    @classmethod
    def get(cls, userid):
        try:
            return User.cached[userid]
        except KeyError:
            return None

User.cached = {}


def load_from_db_by_username(username):
    return db.users.find_one({'username': username})


def authenticate_by_key(username, key):
    user_mc = mcapi.MediaCloud(key)
    if user_mc.verifyAuthToken():
        profile = user_mc.userProfile()
        user = User(username, key, profile=profile)
        User.cached[user.id] = user
        return user
    return AnonymousUserMixin()


def authenticate_by_password(username, password):
    try:
        results = mc.authLogin(username, password)
        if 'error' in results:
            return AnonymousUserMixin()
        profile = results['profile']
        key = profile['api_key']
        user = User(username, key, profile=profile)
        User.cached[user.id] = user
        return user
    except Exception:
        return AnonymousUserMixin()

