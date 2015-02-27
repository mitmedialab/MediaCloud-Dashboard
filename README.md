# MediaMeter Dashboard

MediaMeter is a suite of tools built on top of the MediaCloud online news database. A 
number of tools make up the suite, all driven by a query you author to specify media 
sources, a date range, and some keywords.

The Dashboard shows simplified widgets to give a quick overview of an issue's 
media coverage and let users identify interesting trends for more in-depth analysis. 

### Dependencies

* flask
* flask-login
* flask-wtf
* pymongo
* [MediaCloud-API-Client](https://github.com/c4fcm/MediaCloud-API-Client)

### Creating a module

Modules allow you to define new endpoints on the server as well as
additional models, views, models, and front-end routes.
To begin, create a folder under '''app''' with the name of your module.
Add a '''views.py''' file which will contain the new flask http endpoints.
Then create a file called '''__init__.py''' in that directory so python will
recognize it as a package, and include a line to import views.py.

    mkdir app/foo
    touch app/views.py
    echo "import views" > app/foo/__init__.py
    
Within the module directory, create a '''static''' directory to hold javascript,
css, images, etc. and a '''templates''' directory to hold the server-side
jinja2 templates:

    mkdir app/foo/static
    mkdir app/foo/templates
    
We also need to create symlinks to these directories from the main flask
directories:

    cd app/static
    ln -s ../foo/static foo
    cd ../templates
    ln -s ../foo/templates foo

Finally, update '''app.config''' to include your module by adding '''app.foo'''
to the comma-separated list of '''modules''' under the '''custom''' header.

### Creating a back-end route

### Creating a Result Model

Create the file '''app/foo/static/models.js''' and define a backbone
Model (and Collection, if necessary) corresponding to your flask endpoint.
Add an include for javaUpdate the '''main.html''' template in either dashboard (if you are creating
a dashboard widget) or your module (for a stand-alone module).

TODO

### Creating a Result View ###

TODO

### Available Backbone Mixins ###

TODO

