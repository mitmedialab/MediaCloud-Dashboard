import ConfigParser
import pymongo
import sys
import os
import time
import csv

CONFIG_FILE = '../../app.config'
ITEMS_PER_PAGE = 1000
OUTPUT_DIR = '../../tmp'
TIMESTAMP_FORMAT = '%Y%m%d%H%M%S'


def main(username):
    # setup the output file
    output_file_name = "{}-{}.csv".format(username, time.strftime(TIMESTAMP_FORMAT))
    output_file_path = os.path.join(OUTPUT_DIR, output_file_name)
    columns = ["name", "timestamp", "short-url", "url"]
    csv_file = open(output_file_path, 'wb')
    csv_writer = csv.writer(csv_file)
    csv_writer.writerow(columns)
    # Load configuration
    config = ConfigParser.ConfigParser()
    config.read(CONFIG_FILE)
    # Connect to db
    host = config.get('database', 'host')
    database = config.get('database', 'database')
    db = pymongo.MongoClient(host)[database]
    # Find the user
    results = db['users'].find({'username': username})
    user_info = results[0]
    for q in user_info['saved_queries']:
        csv_writer.writerow([
            q['name'],
            q['timestamp'],
            "https://dashboard.mediacloud.org/q/{}".format(q['shortcode']),
            "https://dashboard.mediacloud.org/#{}".format(q['url']),
        ])
    print "Write out {} saved queries for {}".format(len(user_info['saved_queries']), username)

if __name__ == '__main__':
    username = sys.argv[1]
    main(username)
