import datetime
import json

import flask
import flask_login
import mediacloud
import mediacloud.api as mcapi
import mediacloud.media as mcmedia
import pymongo

from app import app, login_manager, mc, util
from user import User, authenticate_user
from forms import *

@app.route('/')
def index():
    content = flask.render_template('progress.html')
    return flask.render_template('main.html', content=content)

@app.route('/api/login', methods=['POST'])
def login():
    if flask_login.current_user.is_authenticated():
        # User is already logged in, confirm by sending user object
        response = {
            'username': flask_login.current_user.name
            , 'authenticated': True
            , 'anonymous': False
        }
        return json.dumps(response)
    # User is attempting new login, authenticate
    username = ''
    password = ''
    try:
        username = flask.request.form['username']
        password = flask.request.form['password']
    except KeyError:
        pass
    user = authenticate_user(username, password)
    if not user.is_authenticated():
        flask.abort(401)
    flask_login.login_user(user)
    response = {
        'username': username
        , 'authenticated': True
        , 'anonymous': False
    }
    return json.dumps(response)

@app.route('/api/user', methods=['POST'])
def user():
    if flask_login.current_user.is_authenticated():
        # User is already logged in, confirm by sending user object
        response = {
            'username': flask_login.current_user.name
            , 'authenticated': True
            , 'anonymous': False
        }
        return json.dumps(response)
    flask.abort(401)

@app.route('/api/logout', methods=['POST'])
@flask_login.login_required
def logout():
    flask_login.logout_user()
    response = {
        'username': ''
        , 'authenticated': False
    }
    return json.dumps(response)

@app.route('/api/media')
@flask_login.login_required
def media():
    return json.dumps({
        'sources': list(mcmedia.all_sources())
        , 'sets': list(mcmedia.all_sets())
    }, separators=(',',':'));

@app.route('/api/media/sources')
@flask_login.login_required
def media_sources():
    return json.dumps(list(mcmedia.all_sources()), separators=(',',':'))

@app.route('/api/media/sets')
@flask_login.login_required
def media_sets():
    return json.dumps(list(mcmedia.all_sets()), separators=(',',':'))
    
@app.route('/api/sentences/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentences(keywords, media, start, end):
    query = util.solr_query(util.media_to_solr(media), start, end)
    print query
    res = mc.sentencesMatching(keywords , query)
    return json.dumps(res, separators=(',',':'))
    
@app.route('/api/sentences/docs/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentence_docs(keywords, media, start, end):
    query = util.solr_query(util.media_to_solr(media), start, end)
    res = mc.sentencesMatching(keywords , query)
    return json.dumps(res['response']['docs'], separators=(',',':'))
    
@app.route('/api/sentences/numfound/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentence_numfound(keywords, media, start, end):
    queries = util.solr_date_queries(util.media_to_solr(media), start, end)
    results = []
    for date, query in queries:
        res = mc.sentencesMatching(keywords, query)
        results.append({
            'date': date
            , 'numFound': res['response']['numFound']
        })
    return json.dumps(results, separators=(',',':'))
    
@app.route('/api/wordcount/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def wordcount(keywords, media, start, end):
    query = util.solr_query(util.media_to_solr(media), start, end)
    res = mc.wordCount(keywords , query)
    return json.dumps(res, separators=(',',':'))
    
# Callback for flask-login
@login_manager.user_loader
def load_user(userid):
    return User(userid, userid)
