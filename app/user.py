import hashlib

from flask_login import UserMixin, AnonymousUserMixin

from app import db

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
    global db
    hashword = hashlib.sha1(password).hexdigest()
    result = db.users.find_one({u'username': username, u'password': hashword})
    if (result):
        return User(result['username'], result['username'])
    return AnonymousUserMixin()

