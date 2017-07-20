#!/usr/bin/python
from werkzeug.serving import run_simple

from app import flapp

if __name__ == '__main__':
    run_simple('localhost', 5000, flapp, use_reloader=True, use_debugger=True)
