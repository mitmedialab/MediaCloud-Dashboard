
import ConfigParser
import importlib

import flask
from flask.ext.assets import Environment, Bundle
import flask_login
import mediacloud
import mediacloud.api as mcapi
import pymongo
import logging, logging.handlers

import os.path

from raven.conf import setup_logging
from raven.contrib.flask import Sentry
from raven.handlers.logging import SentryHandler

# Load configuration
config = ConfigParser.ConfigParser()
current_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.dirname(os.path.dirname(current_dir))
config.read(os.path.join(base_dir, 'app.config'))

logger = logging.getLogger(__name__)	# the mediameter logger

# setup logging
sentry = Sentry(dsn=config.get('sentry', 'dsn'))
handler = SentryHandler(config.get('sentry', 'dsn'))
setup_logging(handler)
logging.basicConfig(level=logging.INFO)
mc_logger = logging.getLogger('mediacloud')
requests_logger = logging.getLogger('requests')

logger.info("---------------------------------------------------------------------------------------")

# Flask app
flapp = flask.Flask(__name__)
sentry.init_app(flapp)
flapp.secret_key = 'put secret key here'
assets = Environment(flapp)

# Create media cloud api
mc_key = config.get('mediacloud','key')
mc = mcapi.AdminMediaCloud(mc_key)
logger.info("Connected to MediaCloud with default key %s" % (mc_key))
#logging.getLogger('MediaCloud').setLevel(logging.DEBUG)

# Create user login manager
login_manager = flask_login.LoginManager()
login_manager.init_app(flapp)

# Connect to db
host = config.get('database', 'host')
database = config.get('database', 'database')
db = pymongo.MongoClient(host)[database]
logger.info("Connected to DB %s@%s" % (database,host))

# Set up routes and content
import app.core.views

# Import tool-specific code
try:
    modules = config.get('custom', 'modules').split(',')
    modules = [m.strip() for m in modules]
    for m in modules:
        if len(m) > 0:
            importlib.import_module(m)
except ConfigParser.NoOptionError:
    pass
