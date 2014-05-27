
# App-specific intitialization and flask views

import datetime
import json

import flask
import flask_login
import mediacloud
import mediacloud.api as mcapi
import pymongo

import app
import app.util
from app import app as application, mc, mc_key

@application.route('/api/media')
@flask_login.login_required
def media():
    return json.dumps({'sets':app.util.all_media_sets()}, separators=(',',':'));

@application.route('/api/media/sources')
@flask_login.login_required
def media_sources():
    return json.dumps(list(app.util.all_media_sources()), separators=(',',':'))

@application.route('/api/media/sets')
@flask_login.login_required
def media_sets():
    return json.dumps(list(app.util.all_media_sets()), separators=(',',':'))
    
@application.route('/api/sentences/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentences(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    query = app.util.solr_query(app.util.media_to_solr(media), start, end)
    res = user_mc.sentenceList("%s AND (%s)" % (keywords, query), '', 0, 10)
    return json.dumps(res, separators=(',',':'))

def _sentence_docs(api, keywords, media, start, end):
    query = app.util.solr_query(app.util.media_to_solr(media), start, end)
    res = api.sentenceList("%s AND (%s)" % (keywords, query), '', 0, 10, sort=mcapi.MediaCloud.SORT_RANDOM)
    sentences = res['response']['docs']
    for s in sentences:
        s['totalSentences'] = res['response']['numFound'] # hack to get total sentences count to Backbone.js
    return json.dumps(sentences, separators=(',',':'))
    
@application.route('/api/sentences/docs/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentence_docs(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    return _sentence_docs(user_mc, keywords, media, start, end)

@application.route('/api/demo/sentences/docs/<keywords>')
def demo_sentence_docs(keywords):
    media, start, end = demo_params()
    return _sentence_docs(mc, keywords, media, start, end)

@application.route('/api/stories/docs/<keywords>/<media>/<start>/<end>.csv')
@flask_login.login_required
def story_docs_csv(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    query = app.util.solr_query(app.util.media_to_solr(media), start, end)
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
    nf = app.util.NumFound(api_key, keywords, media, start, end)
    results = nf.results()
    return json.dumps(results, separators=(',',':'))

@application.route('/api/sentences/numfound/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentence_numfound(keywords, media, start, end):
    api_key = flask_login.current_user.get_id()
    return _sentence_numfound(api_key, keywords, media, start, end)

@application.route('/api/demo/sentences/numfound/<keywords>')
def demo_sentence_numfound(keywords):
    media, start, end = demo_params()
    return _sentence_numfound(mc_key, keywords, media, start, end)
    
def _wordcount(api, keywords, media, start, end):
    query = app.util.solr_query(app.util.media_to_solr(media), start, end)
    res = api.wordCount("%s AND (%s)" % (keywords , query))
    return json.dumps(res, separators=(',',':'))

@application.route('/api/wordcount/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def wordcount(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    return _wordcount(user_mc, keywords, media, start, end)

@application.route('/api/demo/wordcount/<keywords>')
def demo_wordcount(keywords):
    media, start, end = demo_params()
    return _wordcount(mc, keywords, media, start, end)

def demo_params():
    media = '{"tags":[{"tag_sets_id":5,"tags_id":[8875027]}]}'
    start_date = datetime.date.today() - datetime.timedelta(days=15)
    end_date = datetime.date.today() - datetime.timedelta(days = 1)
    start = start_date.strftime("%Y-%m-%d")
    end = end_date.strftime("%Y-%m-%d")
    return (media, start, end)
