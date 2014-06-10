import os
import sys

# add this directory to the python path, so all the import work
basedir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(basedir)

# tell wsgi what to use as the application
from app import flapp as application
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
