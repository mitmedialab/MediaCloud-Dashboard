import datetime
import json
import logging
from operator import itemgetter

import flask
import flask_login
import mediacloud
import mediacloud.api as mcapi
import pymongo

from app.core import flapp, login_manager, mc, mc_key
import app.core.util
from user import User, authenticate_user
from forms import *

@flapp.route('/')
def index():
    content = flask.render_template('core/progress.html')
    return flask.render_template('main.html', content=content)

@flapp.route('/api/login', methods=['POST'])
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

@flapp.route('/api/user', methods=['POST'])
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

@flapp.route('/api/logout', methods=['POST'])
@flask_login.login_required
def logout():
    flask_login.logout_user()
    response = {
        'username': ''
        , 'authenticated': False
    }
    return json.dumps(response)

# Callback for flask-login
@login_manager.user_loader
def load_user(userid):
    return User(userid, userid)

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
    query = app.core.util.solr_query(app.core.util.media_to_solr(media), start, end)
    res = user_mc.sentenceList("%s AND (%s)" % (keywords, query), '', 0, 10)
    return json.dumps(res, separators=(',',':'))

def _sentence_docs(api, keywords, media, start, end):
    query = app.core.util.solr_query(app.core.util.media_to_solr(media), start, end)
    res = api.sentenceList("%s AND (%s)" % (keywords, query), '', 0, 10, sort=mcapi.MediaCloud.SORT_RANDOM)
    sentences = res['response']['docs']
    for s in sentences:
        s['totalSentences'] = res['response']['numFound'] # hack to get total sentences count to Backbone.js
    return json.dumps(sentences, separators=(',',':'))
    
@flapp.route('/api/sentences/docs/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentence_docs(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    return _sentence_docs(user_mc, keywords, media, start, end)

@flapp.route('/api/demo/sentences/docs/<keywords>')
def demo_sentence_docs(keywords):
    media, start, end = demo_params()
    return _sentence_docs(mc, keywords, media, start, end)

@flapp.route('/api/stories/docs/<keywords>/<media>/<start>/<end>.csv')
@flask_login.login_required
def story_docs_csv(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    query = app.core.util.solr_query(app.core.util.media_to_solr(media), start, end)
    all_stories = []
    last_processed_stories_id = 0
    more_stories = True
    while more_stories:
        res = user_mc.storyList(keywords, query, last_processed_stories_id, 1000)
        if len(res) > 0:
            stories = [ [str(s['stories_id']),s['language'],s['title'],s['url'],s['publish_date']]
                for s in res]
            last_processed_stories_id = res[len(res)-1]['processed_stories_id']
            all_stories = all_stories + stories
            more_stories = True
        else:
            more_stories = False
    def stream_csv(story_list):
        yield ','.join(['stories_id','language','title','url','publish_date']) + '\n'
        for story in story_list:
            yield ','.join(story) + '\n'
    download_filename = 'mediacloud-results-'+datetime.datetime.now().strftime('%Y%m%d%H%M%S')+'.csv'
    return flask.Response(stream_csv(all_stories), mimetype='text/csv', 
                headers={"Content-Disposition":"attachment;filename="+download_filename})
    
def _sentence_numfound(api_key, keywords, media, start, end):
    user_mc = mcapi.MediaCloud(api_key)
    query = "%s AND (%s)" % (keywords, app.core.util.media_to_solr(media))
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
    return _sentence_numfound(api_key, keywords, media, start, end)

@flapp.route('/api/demo/sentences/numfound/<keywords>')
def demo_sentence_numfound(keywords):
    media, start, end = demo_params()
    return _sentence_numfound(mc_key, keywords, media, start, end)
    
def _wordcount(api, keywords, media, start, end):
    query = app.core.util.solr_query(app.core.util.media_to_solr(media), start, end)
    res = api.wordCount("%s AND (%s)" % (keywords , query))
    return json.dumps(res, separators=(',',':'))

@flapp.route('/api/wordcount/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def wordcount(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    return _wordcount(user_mc, keywords, media, start, end)

@flapp.route('/api/demo/wordcount/<keywords>')
def demo_wordcount(keywords):
    media, start, end = demo_params()
    return _wordcount(mc, keywords, media, start, end)

def demo_params():
    media = '{"tags":[8875027]}'
    start_date = datetime.date.today() - datetime.timedelta(days=15)
    end_date = datetime.date.today() - datetime.timedelta(days = 1)
    start = start_date.strftime("%Y-%m-%d")
    end = end_date.strftime("%Y-%m-%d")
    return (media, start, end)
