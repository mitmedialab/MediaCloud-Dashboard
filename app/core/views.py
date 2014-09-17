import datetime, json, logging, traceback, sys
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

# -----------------------------------------------------------------------------------------
# USER MGMT -------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------

@flapp.route('/api/login', methods=['POST'])
def login():
    if flask_login.current_user.is_authenticated():
        # User is already logged in, confirm by sending user object
        response = {
            'username': flask_login.current_user.name
            , 'authenticated': True
            , 'anonymous': False
            , 'key': flask_login.current_user.get_id()
            , 'sentencesAllowed': _sentences_allowed(flask_login.current_user.get_id())
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
        , 'sentencesAllowed': _sentences_allowed(user.get_id())
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
            , 'sentencesAllowed': _sentences_allowed(flask_login.current_user.get_id())
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

# -----------------------------------------------------------------------------------------
# MEDIA -----------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------

@flapp.route('/api/media')
@flask_login.login_required
def media():
    return json.dumps({'sets':app.core.util.all_media_sets()}, separators=(',',':'));

@flapp.route('/api/media/sources/search/<str>')
@flask_login.login_required
def media_search(str):
    return json.dumps(mc.mediaList(name_like=str))

@flapp.route('/api/media/sources')
@flask_login.login_required
def media_sources():
    return json.dumps(list(app.core.util.all_media_sources()), separators=(',',':'))

@flapp.route('/api/media/sets')
@flask_login.login_required
def media_sets():
    return json.dumps(list(app.core.util.all_media_sets()), separators=(',',':'))

@flapp.route('/api/media/sources/single/<media_id>')
@flask_login.login_required
def media_single_source(media_id):
    return json.dumps(mc.media(media_id))

@flapp.route('/api/media/tags/single/<tags_id>')
@flask_login.login_required
def media_single_tags(tags_id):
    return json.dumps(mc.tag(tags_id))

@flapp.route('/api/media/tags/search/<query>')
@flask_login.login_required
def media_search_tags(query):
    return json.dumps(mc.tagList(name_like=query))

# -----------------------------------------------------------------------------------------
# SENTENCES -------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------

@flapp.route('/api/sentences/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentences(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    query = app.core.util.solr_query(keywords, media, start, end)
    app.core.logger.debug("query: sentences %s" % query)
    try:
        res = user_mc.sentenceList(query, '', 0, 10)
        return json.dumps(res, separators=(',',':'))
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

def _sentence_docs(api, keywords, media, start, end, count=10, sort=mcapi.MediaCloud.SORT_RANDOM):
    query = app.core.util.solr_query(keywords, media, start, end)
    app.core.logger.debug("query: _sentence_docs %s" % query)
    start_index = 0
    if sort==mcapi.MediaCloud.SORT_RANDOM :
        # to sort radomly, we need to offset into the results and set sort to random
        # so first we need to know how many senteces there are
        sentence_counts = json.loads(_sentence_numfound(api._auth_token, keywords, media, start, end))
        sentence_total = sum([day['numFound'] for day in sentence_counts])
        sentence_total = min(sentence_total,5000)   # don't offset too far into results otherwise query takes a LONG time to return
        try:
            start_index = randint(0,sentence_total-count)
        except Exception as exception:
            start_index = 0
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
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/demo/sentences/docs/<keywords>')
def demo_sentence_docs(keywords):
    media, start, end = demo_params()
    try:
        return _sentence_docs(mc, keywords, media, start, end)
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

def _sentence_numfound(api_key, keywords, media, start, end):
    user_mc = mcapi.MediaCloud(api_key)
    query_args = []
    query_args.append( app.core.util.keywords_to_solr(keywords) )
    app.core.logger.debug('MEDIA ' + media)
    if app.core.util.media_is_specified(media):
        query_args.append( app.core.util.media_to_solr(media) )
    query = " AND ".join(query_args)
    app.core.logger.debug("query: _sentence_numfound: %s" % query)
    if app.core.util.no_date_specified(start,end):  # HACK: if no date, just return last year
        start = (datetime.datetime.now() - datetime.timedelta(days=365)).strftime('%Y-%m-%d')
        end = datetime.datetime.now().strftime('%Y-%m-%d')
    else:
        start = datetime.datetime.strptime(start, '%Y-%m-%d').strftime('%Y-%m-%d')
        end = (datetime.datetime.strptime(end, '%Y-%m-%d')+datetime.timedelta(days=1)).strftime('%Y-%m-%d')
    response = user_mc.sentenceCount(query, solr_filter='', split=True, split_daily=False, split_start_date=start, split_end_date=end)
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
    app.core.logger.debug("request: /api/sentences/numfound/")
    try:
        return _sentence_numfound(api_key, keywords, media, start, end)
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/demo/sentences/numfound/<keywords>')
def demo_sentence_numfound(keywords):
    media, start, end = demo_params()
    try:
        return _sentence_numfound(mc_key, keywords, media, start, end)
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

# -----------------------------------------------------------------------------------------
# STORIES ---------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------

def _story_public_docs(api, keywords, media, start, end, count=10):
    query = app.core.util.solr_query(keywords, media, start, end)
    app.core.logger.debug("query: _story_docs %s" % query)
    stories = api.storyPublicList(query,rows=count)
    # now add in the titles by calling the private API
    for s in stories:
        s['title']=mc.story(s['stories_id'])['title']
    return json.dumps(stories, separators=(',',':'))
    
@flapp.route('/api/stories/public/docs/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def story_public_docs(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    try:
        return _story_public_docs(user_mc, keywords, media, start, end)
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/demo/stories/docs/<keywords>')
def demo_story_docs(keywords):
    media, start, end = demo_params()
    try:
        return _story_public_docs(mc, keywords, media, start, end)
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

# -----------------------------------------------------------------------------------------
# WORD COUNTS -----------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------

def _wordcount(api, keywords, media, start, end):
    query = app.core.util.solr_query(keywords, media, start, end)
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
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/demo/wordcount/<keywords>')
def demo_wordcount(keywords):
    media, start, end = demo_params()
    try:
        return _wordcount(mc, keywords, media, start, end)
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

_wordcount_export_props = ['term','stem','count']   # pass these into _assemble_csv_response as the properties arg

@flapp.route('/api/wordcount/<keywords>/<media>/<start>/<end>/csv')
@flask_login.login_required
def wordcount_csv(keywords, media, start, end):
    api_key = flask_login.current_user.get_id()
    user_mc = mcapi.MediaCloud(api_key)
    try:
        results = json.loads(app.core.views._wordcount(user_mc, keywords, media, start, end))
        return assemble_csv_response(results,_wordcount_export_props,_wordcount_export_props,'wordcount')
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/export/svg', methods=['POST'])
def export_svg():
    response = flapp.make_response(flask.request.form['content'])
    disposition = "attachment; filename=%s" % flask.request.form['filename']
    response.headers["Content-Disposition"] = disposition
    return response

# -----------------------------------------------------------------------------------------
# HELPERS ---------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------

def _sentences_allowed(key):
    '''
    This method tells you whether the key passed in is allowed to call sentenceList or not.
    Public authenticated users are not allowed to call sentenceList (it throws a 403).
    '''
    media, start, end = demo_params()
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    query = app.core.util.solr_query('*', media, start, end)
    allowed = None
    try:
        res = user_mc.sentenceList(query, '', 0, 0)
        allowed = True
    except Exception as exception:
        allowed = False
    app.core.logger.debug("_sentences_allowed check: sentenceList %s for key %s " % (allowed, key) )
    return allowed

def csv_escape(s):  # TODO: do this better and in one place
    return '"%s"' % s.replace('"', '"",').strip()

def assemble_csv_response(results,properties,column_names,filename):
    app.core.logger.debug("assemble_csv_response with "+str(len(results))+" results")
    app.core.logger.debug("  cols: "+' '.join(column_names))
    app.core.logger.debug("  props: "+' '.join(properties))
    # stream back a csv
    def stream_csv(data,props,names):
        yield ','.join(names) + '\n'
        for row in data:
            try:
                attributes = [ row[p] if isinstance(row[p], str) else str(row[p]) for p in props ] 
                yield ','.join(attributes) + '\n'
            except Exception as e:
                app.core.logger.error("Couldn't process a CSV row: "+str(e))
                app.core.logger.debug(row)
    download_filename = 'mediacloud-'+str(filename)+'-'+datetime.datetime.now().strftime('%Y%m%d%H%M%S')+'.csv'
    return flask.Response(stream_csv(results,properties,column_names), mimetype='text/csv; charset=utf-8', 
                headers={"Content-Disposition":"attachment;filename="+download_filename})

def demo_params():
    media = '{"sets":[8875027]}'
    start_date = datetime.date.today() - datetime.timedelta(days=15)
    end_date = datetime.date.today() - datetime.timedelta(days = 1)
    start = start_date.strftime("%Y-%m-%d")
    end = end_date.strftime("%Y-%m-%d")
    return (media, start, end)
