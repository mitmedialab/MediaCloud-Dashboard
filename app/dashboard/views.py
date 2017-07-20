import json
import flask_login
import mediacloud.api as mcapi

from app.core.apicache import cached_story_public_list
from app.core import flapp, app_mc_key, mc
import app.core.views

_sentence_export_props = ['date','numFound']
_sentence_export_columns = ['date','sentences']

@flapp.route('/api/demo/sentences/numfound/<keywords>/csv')
def demo_sentence_numfound_csv(keywords):
    media, start, end = app.core.views.demo_params()
    try:
        results = json.loads(app.core.views._sentence_numfound(app_mc_key, keywords, media, start, end))
        return app.core.views.assemble_csv_response(results, 
            _sentence_export_props, _sentence_export_columns,'demo-sentence-counts')
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/sentences/numfound/<keywords>/<media>/<start>/<end>/csv')
@flask_login.login_required
def sentence_numfound_csv(keywords, media, start, end):
    api_key = flask_login.current_user.get_id()
    app.core.logger.debug("sentence_numfound_csv: %s %s %s %s", (keywords,media,start,end))
    try:
        results = json.loads(app.core.views._sentence_numfound(api_key, keywords, media, start, end))
        return app.core.views.assemble_csv_response(results, 
            _sentence_export_props, _sentence_export_columns,'sentence-counts')
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/demo/wordcount/<keywords>/csv')
def demo_wordcount_csv(keywords):
    media, start, end = app.core.views.demo_params()
    try:
        results = json.loads(app.core.views._cached_wordcount(mc, keywords, media, start, end))
        return app.core.views.assemble_csv_response(results,
            _wordcount_export_props,_wordcount_export_props,'demo-wordcount')
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/stories/public/docs/<keywords>/<media>/<start>/<end>.csv')
@flask_login.login_required
def public_story_docs_csv(keywords, media, start, end):
    '''
    CSV download for public authenticated users
    '''
    app.core.logger.debug("Starting public story docs CSV download")
    query = app.core.util.solr_query(keywords, media, start, end)
    all_stories = []
    last_processed_stories_id = 0
    more_stories = True
    try:
        while more_stories:
            res = cached_story_public_list(flask_login.current_user.get_id(), q=query,
                                           last_processed_stories_id=last_processed_stories_id)
            if len(res) > 0:
                last_processed_stories_id = res[len(res)-1]['processed_stories_id']
                all_stories = all_stories + res
                more_stories = True
            else:
                more_stories = False
        props = ['stories_id', 'language', 'title', 'publish_date', 'url']
        return app.core.views.assemble_csv_response(all_stories,props,props,'public_stories')
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400    

@flapp.route('/api/stories/docs/<keywords>/<media>/<start>/<end>.csv')
@flask_login.login_required
def story_docs_csv(keywords, media, start, end):
    '''
    CSV download for power users
    '''
    app.core.logger.debug("Starting story docs CSV download")
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    query = app.core.util.solr_query(keywords, media, start, end)
    all_stories = []
    last_processed_stories_id = 0
    more_stories = True
    try:
        while more_stories:
            res = user_mc.storyList(query, '', last_processed_stories_id, 1000)
            if len(res) > 0:
                last_processed_stories_id = res[len(res)-1]['processed_stories_id']
                all_stories = all_stories + res
                more_stories = True
            else:
                more_stories = False
        props = ['stories_id','language','title','publish_date','bitly_click_count','url','guid']
        return app.core.views.assemble_csv_response(all_stories,props,props,'stories')
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400    
