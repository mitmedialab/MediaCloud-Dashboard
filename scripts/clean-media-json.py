import json

with open('media-raw.json', 'rb') as f:
    media = json.loads(f.read())

for i, source in enumerate(media['sources']):
    del media['sources'][i]['extract_author']
    del media['sources'][i]['full_text_rss']
    del media['sources'][i]['foreign_rss_links']
    del media['sources'][i]['sw_data_start_date']
    del media['sources'][i]['feeds_added']
    del media['sources'][i]['moderated']
    del media['sources'][i]['unpaged_stories']
    del media['sources'][i]['sw_data_end_date']
    del media['sources'][i]['use_pager']
    del media['sources'][i]['dup_media_id']
    del media['sources'][i]['is_not_dup']
    del media['sources'][i]['moderation_notes']

for i, set in enumerate(media['sets']):
    del media['sets'][i]['media_ids']

with open('media.json', 'wb') as f:
    f.write(json.dumps(media, separators=(',',':')))
    