
import ConfigParser
import importlib

import flask
import flask_login
import mediacloud
import mediacloud.api as mcapi
import pymongo
import logging, logging.handlers

import os.path

# Load configuration
config = ConfigParser.ConfigParser()
current_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.dirname(os.path.dirname(current_dir))
config.read(os.path.join(base_dir, 'app.config'))

logger = logging.getLogger(__name__)	# the mediameter logger

# setup logging
logging.basicConfig(level=logging.INFO)
log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
log_handler = logging.handlers.RotatingFileHandler(
	os.path.join(base_dir,'log','mediameter.log'), 'a', 10485760, 10) # 10MB
log_handler.setFormatter(log_formatter)
# set up mediacloud logging to the file
mc_logger = logging.getLogger('mediacloud')
mc_logger.propagate = False
mc_logger.addHandler(log_handler)
# set up requests logging to the file
requests_logger = logging.getLogger('requests')
requests_logger.propagate = False
requests_logger.addHandler(log_handler)
# set up mediameter logging the same way
logger.propagate = False
logger.addHandler(log_handler)

logger.info("---------------------------------------------------------------------------------------")

# Flask app
flapp = flask.Flask(__name__)
flapp.secret_key = 'put secret key here'

# Create media cloud api
mc_key = config.get('mediacloud','key')
mc = mcapi.MediaCloud(mc_key)
logger.info("Connected to MediaCloud with default key %s" % (mc_key))
#logging.getLogger('MediaCloud').setLevel(logging.DEBUG)

# Create user login manager
login_manager = flask_login.LoginManager()
login_manager.init_app(flapp)

# Connect to db
host = config.get('database', 'host')
database = config.get('database', 'database')
db = pymongo.Connection(host)[database]
logger.info("Connected to DB %s@%s" % (database,host))

# Set up routes and content
import app.core.views

# Import tool-specific code
try:
    modules = config.get('custom', 'modules').split(',')
    for m in modules:
        if len(m) > 0:
            importlib.import_module(m)
except ConfigParser.NoOptionError:
    pass
