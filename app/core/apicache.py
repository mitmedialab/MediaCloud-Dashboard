import mediacloud.api as mcapi

from app.core import app_mc_key
from app.core.cache import cache


def _get_user_mc(api_key, force_admin=False):
    if force_admin or (api_key == app_mc_key):
        return mcapi.AdminMediaCloud(api_key)
    return mcapi.MediaCloud(api_key)


@cache
def cached_story_public_list(api_key, q, fq='', last_processed_stories_id=0, rows=1000):
    user_mc = _get_user_mc(api_key)
    return user_mc.storyPublicList(q, fq, last_processed_stories_id, rows)


@cache
def cached_story_list(api_key, q, fq='', last_processed_stories_id=0, rows=1000):
    user_mc = _get_user_mc(api_key)
    return user_mc.storyList(q, fq, last_processed_stories_id, rows)

@cache
def cached_story_count(api_key, q):
    user_mc = _get_user_mc(api_key)
    return user_mc.storyCount(q)


@cache
def cached_sentence_list(api_key, q, fq='', start_index=0, rows=1000, sort=mcapi.MediaCloud.SORT_PUBLISH_DATE_ASC):
    user_mc = _get_user_mc(api_key)
    return user_mc.sentenceList(q, fq, start=start_index, rows=rows, sort=sort)


@cache
def cached_word_count(api_key, q):
    user_mc = _get_user_mc(api_key)
    return user_mc.wordCount(q)


@cache
def cached_sentence_field_count(api_key, q, tag_sets_id, sample_size, field='tags_id_stories'):
    user_mc = _get_user_mc(api_key)
    return user_mc.sentenceFieldCount(q, tag_sets_id=tag_sets_id, sample_size=sample_size, field=field)


@cache
def cached_split_sentence_count(api_key, q, start, end):
    user_mc = _get_user_mc(api_key)
    return user_mc.sentenceCount(q, solr_filter='', split=True, split_daily=False, split_start_date=start, split_end_date=end)


@cache
def cached_media(api_key, media_id):
    user_mc = _get_user_mc(api_key)
    return user_mc.media(media_id)

@cache
def cached_tag(api_key, tags_id):
    user_mc = _get_user_mc(api_key)
    return user_mc.tag(tags_id)
