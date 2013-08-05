import hashlib

from flask import Flask, flash, redirect, render_template, request, url_for
from flask_login import AnonymousUserMixin, LoginManager, UserMixin, current_user, login_required, login_user, logout_user
from flask.ext.wtf import Form
import pymongo
from wtforms import TextField, PasswordField, validators

# Settings
config_host = 'localhost'
config_db = 'attention'

# Flask app
app = Flask(__name__)

# Create user login manager
login_manager = LoginManager()
login_manager.init_app(app)

# Connect to db
db = pymongo.Connection(config_host)[config_db]

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

def authenticate_user(email, password):
    global db
    hash = hashlib.sha1(password).hexdigest()
    result = db.users.find_one({u'email': email, u'hash': hash})
    if (result):
        return User(result['username'], result['email'])
    flash('Invalid username/password combination.')
    return AnonymousUserMixin()

class LoginForm(Form):
    email = TextField('Email Address', [validators.Required()])
    password = PasswordField('Password', [validators.Required()])
    

@app.route('/')
def index():
    return render_template('wrapper.html', content='Home page')

@app.route('/login', methods=['GET', 'POST'])
def login():
    print 'in login';
    form = LoginForm(request.form)
    if form.validate_on_submit():
        user = authenticate_user(form.email.data, form.password.data)
        if not user.is_authenticated():
            return redirect(url_for('login'))
        login_user(user)
        return redirect(request.args.get('next') or url_for('index'))
    return render_template('login.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# Callback for flask-login
@login_manager.user_loader
def load_user(userid):
    return User(userid, userid)


if __name__ == '__main__':
    app.debug = True
    app.secret_key = 'put secret key here'
    app.run()
    