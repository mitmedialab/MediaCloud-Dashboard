import datetime
import json
import logging
from random import randint
from operator import itemgetter

import flask
import flask_login
import mediacloud
import mediacloud.api as mcapi
import pymongo

from app.core import config, flapp, login_manager, mc, mc_key
import app.core.util
from user import User, authenticate_user, authenticate_user_key
from forms import *

@flapp.route('/')
def index():
    content = flask.render_template('core/progress.html')
    template = config.get('flask', 'template')
    return flask.render_template(template, content=content)

@flapp.route('/api/login', methods=['POST'])
def login():
    if flask_login.current_user.is_authenticated():
        # User is already logged in, confirm by sending user object
        response = {
            'username': flask_login.current_user.name
            , 'authenticated': True
            , 'anonymous': False
            , 'key': flask_login.current_user.get_id()
        }
        return json.dumps(response)
    # User is attempting new login, authenticate
    username = ''
    password = ''
    key = ''
    try:
        username = flask.request.form['username']
        password = flask.request.form['password']
        user = authenticate_user(username, password)
    except KeyError:
        try:
            username = flask.request.form['username']
            key = flask.request.form['key']
            user = authenticate_user_key(username, key)
        except KeyError:
            pass
    if not user.is_authenticated():
        flask.abort(401)
    flask_login.login_user(user)
    response = {
        'username': username
        , 'authenticated': True
        , 'anonymous': False
        , 'key': user.get_id()
    }
    return json.dumps(response)

@flapp.route('/api/user', methods=['POST'])
def user():
    if flask_login.current_user.is_authenticated():
        # User is already logged in, confirm by sending user object
        response = {
            'username': flask_login.current_user.name
            , 'authenticated': True
            , 'anonymous': False
            , 'key': flask_login.current_user.get_id()
        }
        return json.dumps(response)
    flask.abort(401)

@flapp.route('/api/logout', methods=['POST'])
@flask_login.login_required
def logout():
    flask_login.logout_user()
    response = {
        'username': ''
        , 'authenticated': False
        , 'key': ''
    }
    return json.dumps(response)

# Callback for flask-login
@login_manager.user_loader
def load_user(userid):
    return User.get(userid)

@flapp.route('/api/media')
@flask_login.login_required
def media():
    return json.dumps({'sets':app.core.util.all_media_sets()}, separators=(',',':'));

@flapp.route('/api/media/sources')
@flask_login.login_required
def media_sources():
    return json.dumps(list(app.core.util.all_media_sources()), separators=(',',':'))

@flapp.route('/api/media/sets')
@flask_login.login_required
def media_sets():
    return json.dumps(list(app.core.util.all_media_sets()), separators=(',',':'))

@flapp.route('/api/sentences/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentences(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    filter_query = app.core.util.solr_query(app.core.util.media_to_solr(media), start, end)
    query = "%s AND (%s)" % (app.core.util.keywords_to_solr(keywords), filter_query)
    app.core.logger.debug("query: sentences %s" % query)
    try:
        res = user_mc.sentenceList(query, '', 0, 10)
        return json.dumps(res, separators=(',',':'))
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

def _sentence_docs(api, keywords, media, start, end, count=10, sort=mcapi.MediaCloud.SORT_RANDOM):
    filter_query = app.core.util.solr_query(app.core.util.media_to_solr(media), start, end)
    query = "%s AND (%s)" % (app.core.util.keywords_to_solr(keywords), filter_query)
    app.core.logger.debug("query: _sentence_docs %s" % query)
    start_index = 0
    if sort==mcapi.MediaCloud.SORT_RANDOM :
        # to sort radomly, we need to offset into the results and set sort to random
        # so first we need to know how many senteces there are
        sentence_counts = json.loads(_sentence_numfound(api._auth_token, keywords, media, start, end))
        sentence_total = sum([day['numFound'] for day in sentence_counts])
        start_index = randint(0,sentence_total-count)
    res = api.sentenceList(query, '', start_index, count, sort=sort)
    sentences = res['response']['docs']
    for s in sentences:
        s['totalSentences'] = res['response']['numFound'] # hack to get total sentences count to Backbone.js
    return json.dumps(sentences, separators=(',',':'))
    
@flapp.route('/api/sentences/docs/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentence_docs(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    try:
        return _sentence_docs(user_mc, keywords, media, start, end)
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/demo/sentences/docs/<keywords>')
def demo_sentence_docs(keywords):
    media, start, end = demo_params()
    try:
        return _sentence_docs(mc, keywords, media, start, end)
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400
    
def _sentence_numfound(api_key, keywords, media, start, end):
    user_mc = mcapi.MediaCloud(api_key)
    query = "%s AND (%s)" % (app.core.util.keywords_to_solr(keywords), app.core.util.media_to_solr(media))
    app.core.logger.debug("query: _sentence_numfound: %s" % query)
    start = datetime.datetime.strptime(start, '%Y-%m-%d').strftime('%Y-%m-%d')
    end = datetime.datetime.strptime(end, '%Y-%m-%d').strftime('%Y-%m-%d')
    response = user_mc.sentenceCount(query, solr_filter='', split=True, split_daily=True, split_start_date=start, split_end_date=end)
    del response['split']['gap']
    del response['split']['start']
    del response['split']['end']
    date_counts = []
    for date, num_found in response['split'].iteritems():
        date_counts.append({
            "date": date[:10]
            , "numFound": num_found
        })
    date_counts = sorted(date_counts, key=lambda d: datetime.datetime.strptime(d["date"], "%Y-%m-%d"))
    return json.dumps(date_counts, separators=(',',':'))

@flapp.route('/api/sentences/numfound/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentence_numfound(keywords, media, start, end):
    api_key = flask_login.current_user.get_id()
    try:
        return _sentence_numfound(api_key, keywords, media, start, end)
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/demo/sentences/numfound/<keywords>')
def demo_sentence_numfound(keywords):
    media, start, end = demo_params()
    try:
        return _sentence_numfound(mc_key, keywords, media, start, end)
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400
    
def _wordcount(api, keywords, media, start, end):
    filter_query = app.core.util.solr_query(app.core.util.media_to_solr(media), start, end)
    query = "%s AND (%s)" % (app.core.util.keywords_to_solr(keywords) , filter_query)
    app.core.logger.debug("query: _wordcount: %s" % query)
    res = api.wordCount(query)
    return json.dumps(res, separators=(',',':'))

@flapp.route('/api/wordcount/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def wordcount(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    try:
        return _wordcount(user_mc, keywords, media, start, end)
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/demo/wordcount/<keywords>')
def demo_wordcount(keywords):
    media, start, end = demo_params()
    try:
        return _wordcount(mc, keywords, media, start, end)
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

def demo_params():
    media = '{"sets":[8875027]}'
    start_date = datetime.date.today() - datetime.timedelta(days=15)
    end_date = datetime.date.today() - datetime.timedelta(days = 1)
    start = start_date.strftime("%Y-%m-%d")
    end = end_date.strftime("%Y-%m-%d")
    return (media, start, end)
