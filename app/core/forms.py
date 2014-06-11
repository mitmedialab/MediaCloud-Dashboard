from flask.ext.wtf import Form
from wtforms import TextField, PasswordField, validators

class LoginForm(Form):
    email = TextField('Email Address', [validators.Required()])
    password = PasswordField('Password', [validators.Required()])
