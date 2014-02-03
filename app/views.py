import json

import flask
import flask_login
import pymongo

from app import app, login_manager
from user import User, authenticate_user
from forms import *

@app.route('/')
def index():
    content = '<p>To add content, modify <code>views.py</code>.<p>'
    return flask.render_template('wrapper.html', content=content)

@app.route('/login', methods=['POST'])
def login():
    username = flask.request.form['username']
    password = flask.request.form['password']
    user = authenticate_user(username, password)
    if not user.is_authenticated():
        flask.flash('Invalid username/password combination.')
        flask.abort(401)
    flask_login.login_user(user)
    response = {
        'username': flask.request.form['username']
        , 'authenticated': True
    }
    return json.dumps(response)

@app.route('/logout', methods=['POST'])
@flask_login.login_required
def logout():
    flask_login.logout_user()
    response = {
        'username': ''
        , 'authenticated': False
    }
    return json.dumps(response)

# Callback for flask-login
@login_manager.user_loader
def load_user(userid):
    return User(userid, userid)
