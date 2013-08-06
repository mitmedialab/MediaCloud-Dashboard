from flask import Flask
from flask_login import LoginManager
from pymongo import Connection

# Settings
config_host = 'localhost'
config_db = 'attention'

# Flask app
app = Flask(__name__)
app.secret_key = 'put secret key here'

# Create user login manager
login_manager = LoginManager()
login_manager.init_app(app)

# Connect to db
db = Connection(config_host)[config_db]

from app import views