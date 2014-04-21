import datetime
import json

import flask
import flask_login
import pymongo

from app import app, login_manager, mc, util
from user import User, authenticate_user
from forms import *

from app import app_views

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

# Callback for flask-login
@login_manager.user_loader
def load_user(userid):
    return User(userid, userid)

@app.route('/api/media')
@flask_login.login_required
def media():
    return json.dumps({'sets':util.all_media_sets()}, separators=(',',':'));

@app.route('/api/media/sources')
@flask_login.login_required
def media_sources():
    return json.dumps(list(util.all_media_sources()), separators=(',',':'))

@app.route('/api/media/sets')
@flask_login.login_required
def media_sets():
    return json.dumps(list(util.all_media_sets()), separators=(',',':'))
    
@app.route('/api/sentences/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentences(keywords, media, start, end):
    query = util.solr_query(util.media_to_solr(media), start, end)
    res = mc.sentenceList(keywords , query)
    return json.dumps(res, separators=(',',':'))
    
@app.route('/api/sentences/docs/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentence_docs(keywords, media, start, end):
    query = util.solr_query(util.media_to_solr(media), start, end)
    print query
    res = mc.sentenceList(keywords, query, 0, 10)
    sentences = res['response']['docs']
    for s in sentences:
        s['totalSentences'] = res['response']['numFound'] # hack to get total sentences count to Backbone.js
        story = mc.story(s['stories_id'])
        s['storyUrl'] = story['url'] # so you can click on the sentence
    return json.dumps(sentences, separators=(',',':'))

@app.route('/api/stories/docs/<keywords>/<media>/<start>/<end>.csv')
@flask_login.login_required
def story_docs_csv(keywords, media, start, end):
    query = util.solr_query(util.media_to_solr(media), start, end)
    all_stories = []
    last_processed_stories_id = 0
    more_stories = True
    while more_stories:
        res = mc.storyList(keywords, query, last_processed_stories_id, 1000)
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
    
@app.route('/api/sentences/numfound/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentence_numfound(keywords, media, start, end):
    nf = util.NumFound(mc, keywords, media, start, end)
    results = nf.results()
    return json.dumps(results, separators=(',',':'))
    
@app.route('/api/wordcount/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def wordcount(keywords, media, start, end):
    query = util.solr_query(util.media_to_solr(media), start, end)
    res = mc.wordCount(keywords , query)
    return json.dumps(res, separators=(',',':'))
