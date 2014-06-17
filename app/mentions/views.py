import datetime

import flask, flask_login
import mediacloud.api as mcapi

import app.core
from app.core import flapp
import app.core.util

@flapp.route('/api/stories/docs/<keywords>/<media>/<start>/<end>.csv')
@flask_login.login_required
def story_docs_csv(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    query = app.core.util.solr_query(app.core.util.media_to_solr(media), start, end)
    all_stories = []
    last_processed_stories_id = 0
    more_stories = True
    def csv_escape(s):
        return '"%s"' % s.replace('"', '"",')
    while more_stories:
        res = user_mc.storyList(keywords, query, last_processed_stories_id, 1000)
        if len(res) > 0:
            stories = [ [str(s['stories_id']),s['language'],csv_escape(s['title']),s['url'],s['publish_date']]
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
