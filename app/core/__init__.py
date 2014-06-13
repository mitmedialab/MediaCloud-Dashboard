
import ConfigParser

import flask
import flask_login
import mediacloud
import mediacloud.api as mcapi
import pymongo
import logging

import os.path

# Load configuration
config = ConfigParser.ConfigParser()
current_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.dirname(os.path.dirname(current_dir))
config.read(os.path.join(base_dir, 'app.config'))

# Flask app
flapp = flask.Flask(__name__)
flapp.secret_key = 'put secret key here'

# Create media cloud api
mc_key = config.get('mediacloud','key')
mc = mcapi.MediaCloud(mc_key)
#logging.getLogger('MediaCloud').setLevel(logging.DEBUG)

# Create user login manager
login_manager = flask_login.LoginManager()
login_manager.init_app(flapp)

# Connect to db
host = config.get('database', 'host')
database = config.get('database', 'database')
db = pymongo.Connection(host)[database]

# Set up routes and content
from app.core import views
