import ConfigParser, logging, os, shutil, sys, json, datetime
import mediacloud

CONFIG_FILE = '../app.config'
ITEMS_PER_PAGE = 1000
OUTPUT_DIR = '../app/static/data/'
OUTPUT_FILE = 'media.json'
TIMESTAMP_FORMAT = '%Y%m%d%H%M%S'
BACKUP_OUTPUT_FILE = 'media.json.backup-'+datetime.datetime.now().strftime(TIMESTAMP_FORMAT)

def main():

    # first backup the old file
    json_file_path = os.path.join(OUTPUT_DIR, OUTPUT_FILE)
    backup_json_path = os.path.join(OUTPUT_DIR, BACKUP_OUTPUT_FILE)
    if os.path.exists(json_file_path):
        print('Backing up old media.json')
        shutil.copyfile(json_file_path,backup_json_path)

    # connect to mediacloud
    config = ConfigParser.ConfigParser()
    config.read( CONFIG_FILE )
    mc = mediacloud.api.MediaCloud(config.get('mediacloud','key'))
    
    # page through sources
    print "Fetching Sources:"
    sources = []
    current = 0
    more_rows = True
    while more_rows:
        print "  At "+str(current)
        collection = mc.mediaList(current,ITEMS_PER_PAGE)
        [ sources.append( {'media_id': m['media_id'], 'name': m['name'], 'url': m['url']} ) 
            for m in collection ]
        current = current + len(collection)
        #more_rows = True if len(collection)>0 else False
        more_rows = False
    
    # page through sets
    print "Fetching Sets:"
    sets = []
    current = 0
    more_rows = True
    while more_rows:
        print "  At "+str(current)
        collection = mc.mediaSetList(current,ITEMS_PER_PAGE)
        [ sets.append( {'id': m['media_sets_id'], 'name': m['name']} ) 
            for m in collection ]
        current = current + len(collection)
        #more_rows = True if len(collection)>0 else False
        more_rows = False

    # stitch it together and output it
    print "Writing Output"
    results = {'sources':sources,'sets':sets}
    with open(json_file_path, 'w') as outfile:
        json.dump(results, outfile)
    print "Done"

if __name__ == '__main__':
    main()
