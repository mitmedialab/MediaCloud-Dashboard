
import ConfigParser

import flask
import flask_login
import pymongo

# Load configuration
config = ConfigParser.ConfigParser()
config.read('app.config')

# Flask app
app = flask.Flask(__name__)
app.secret_key = 'put secret key here'

# Create user login manager
login_manager = flask_login.LoginManager()
login_manager.init_app(app)

# Connect to db
host = config.get('database', 'host')
database = config.get('database', 'database')
db = pymongo.Connection(host)[database]

# Set up routes and content
from app import views
