from flask import Flask, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user
import pymongo

from app import app, login_manager
from user import User, authenticate_user
from forms import *

@app.route('/')
def index():
    content = '<p>To add content, modify <code>views.py</code>.<p>'
    return render_template('wrapper.html', content=content)

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
