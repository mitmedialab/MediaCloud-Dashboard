import datetime
import json

import flask
import flask_login
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
    return json.dumps(util.all_media(), separators=(',',':'));

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
    print keywords
    print media
    print start
    print end
    query = util.solr_query(util.media_to_solr(media), start, end)
    res = mc.sentenceList(keywords, query, 0, 10)
    sentences = res['response']['docs']
    for s in sentences:
        s['totalSentences'] = res['response']['numFound']
    return json.dumps(sentences, separators=(',',':'))

@app.route('/api/sentences/docs/<keywords>/<media>/<start>/<end>.csv')
@flask_login.login_required
def sentence_docs_csv(keywords, media, start, end):
    print keywords
    print media
    print start
    print end
    query = util.solr_query(util.media_to_solr(media), start, end)
    all_sentences = []
    row = 0
    more_sentences = True
    while more_sentences:
        res = mc.sentenceList(keywords, query, row)
        result_count = len(res['response']['docs'])
        row+= result_count
        if result_count > 0:
            all_sentences = all_sentences + res['response']['docs']
            more_sentences = True
        else:
            more_sentences = False
    def stream_csv(sentenceList):
        yield ','.join(['language','media_id','media_name','publish_date','stories_id','story_sentences_id','sentence']) + '\n'
        for s in sentenceList:
            # language,media_id,publish_date,stories_id,story_sentences_id,sentence
            info = [ s['language'], str(s['media_id']), s['publish_date'], str(s['stories_id']), str(s['story_sentences_id']), s['sentence'] ]
            yield ','.join(info) + '\n'
    return flask.Response(stream_csv(all_sentences), mimetype='text/csv', 
                headers={"Content-Disposition":"attachment;filename=mediacloud-results.csv"})
    
@app.route('/api/sentences/numfound/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentence_numfound(keywords, media, start, end):
    queries = util.solr_date_queries(util.media_to_solr(media), start, end)
    results = []
    for date, query in queries:
        res = mc.sentenceList(keywords, query, 0, 0)
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
