# MediaCloud Dashboard

MediaCloud is a suite of tools built on top of the MediaCloud online news database. A 
number of tools make up the suite, all driven by a query you author to specify media 
sources, a date range, and some keywords.

The Dashboard shows simplified widgets to give a quick overview of an issue's 
media coverage and let users identify interesting trends for more in-depth analysis. 

### Dependencies

You gotta install the [MediaCloud-API-Client](https://github.com/c4fcm/MediaCloud-API-Client) 
by hand.  Then just
```
pip install -r requirements.pip
```

### Creating a module

Modules allow you to define new endpoints on the server as well as
additional models, views, models, and front-end routes.
To begin, create a folder under `app` with the name of your module.
Add a `views.py` file which will contain the new flask http endpoints.
Then create a file called `__init__.py` in that directory so python will
recognize it as a package, and include a line to import views.py.

    mkdir app/foo
    touch app/views.py
    echo "import views" > app/foo/__init__.py
    
Within the module directory, create a `static` directory to hold javascript,
css, images, etc. and a `templates` directory to hold the server-side
jinja2 templates:

    mkdir app/foo/static
    mkdir app/foo/templates
    
We also need to create symlinks to these directories from the main flask
directories:

    cd app/static
    ln -s ../foo/static foo
    cd ../templates
    ln -s ../foo/templates foo

Finally, update `app.config` to include your module by adding `app.foo`
to the comma-separated list of `modules` under the `custom` header.

### Creating a back-end route

In your module `views.py`, add a new method that returns some json
```python
@flapp.route('/api/important-info/<id>')
def important_info(id):
    results = ms.getRelevantData(id)
    return json.dumps(results)
```
You can now test this route in your browser to make sure it returns the JSON you want.

### Creating a Result Model

Create the file `app/foo/static/models.js` and define a backbone
Model (and Collection, if necessary) corresponding to your flask endpoint:
```javascript
App.ImportantInfoModel = Backbone.Model.extend({
    url: function() {
        return '/api/important-info/' + this.id;
    }
});
```
Add an include for javascript the `main.html` template in either dashboard (if you are creating
a dashboard widget) or your module (for a stand-alone module).

### Creating a Result View ###

Views are defined in the `views.js` file.  Assume that your view will be created with the 
model that it needs (we'll set that up later).  All you really need to do is set up a `render` 
function that displays the relevant info from the model.  The key is that the HTML is defined 
in a template HTML file.  

First make your HTML file in your module's `template` folder - 
`important_info.html`:
```html
<script id="tpl-important-info-view" type="text/template">
<div class="important-info-view panel panel-default">
  <div class="panel-heading">
    <h2 class="panel-title">Important Info</h2>
  </div>
  <div class="copy panel-body">
  	<div class="row">
  		<div class="col-md-12">
      Id = {{id}}
  		</div>
  	</div>
  </div>
</div>
</script>
```
Now edit your `main.html` to include this template:
```
{% block backbone_templates %}
    {% include 'foo/important_info.html' %}
{% endblock %}
```

Now you need to make a view that uses the model info to render with this template:
```javascript
App.ImportantInfoView = App.NestedView.extend({
    name:'ImportantInfoView',
    template: _.template($('#tpl-important-info-view').html()),
    events: {},
    initialize: function (options) {
        _.bindAll(this, 'render');
        var that = this;
        this.model.fetch({
            success: function() {
                that.render();
            }
        });
    },
    render: function () {
        var modelJson = this.model.toJSON();
        this.$el.html(this.template(modelJson));
    }
};
```
Now all the view pieces are ready to go!

### Routing a URL to your View ###

If you are creating a whole new view, you need to add a route for it in your `routes.js` file.
Add an entry like this:
```javascript
'important-info/:id': App.Controller.routeImportantInfo
```

Now in your `controller.js`, define that method like this:
```javascript
routeImportantInfo: function(objId){
    App.debug('Route: important info');
	var importantInfoModel = new App.importantInfoModel({id:objId});
    var importantInfoView = App.con.vm.getView(App.ImportantInfoView, {model:importantInfoModel});
    App.con.vm.showView(importantInfoView);
}
```

Now when you hit this url, the app will create a model instance, and the view will fetch the info 
and render it on the page. 

### Available Backbone Mixins ###

TODO

### Object Model ###

[Object model diagram](docs/object_model.jpg)

### Custom Classes ###

#### NestedModel ####

Models extended from `App.NestedModel` can have `Model` objects as properties. When a subclass of `NestedModel` is defined,
any properties that have `Model` or `Collection` objects for their value are specified using the `attributeModels` object.
The object's keys are the property names while the values are the constructors for their respective `Model` or `Collection`:

    App.MediaModel = App.NestedModel.extend({
        attributeModels: {
            "sources": App.MediaSourceCollection
            , "tags": App.SimpleTagCollection
        },
        ...
    });

When a subclass of `NestedModel` is loaded (and the `parse` parameter is `true`),
for each JSON key matching one of the `attributeModel` keys, the value will be passed to the associated constructor.

### Authentication ###

[Authentication flow diagram](docs/authentication_flow.jpg)

Authentication takes place primarily in `App.Controller` and `App.UserModel`. The `initialize()` functions of each class set up listeners for authentication events. The email address and key are stored in cookies on the client, rather than in the flask session to allow the same login to be used across different tools, which will have different urls and sessions.

#### Authentication: UserModel ####

**Listens to**: `sync`, `error` 
**Throws**: `signin`, `signout`, `unauthorized`

To sign a user in using a key or password:

    var user = new UserModel();
    // Sign in with cookies
    user.signIn({});
    // Sign in with username and password
    user.signIn({
        "username": "foo"
        "password": "bar"
    });

`UserModel` provides an `authenticate` attribute.
This attribute is a [jQuery Deferred](https://api.jquery.com/jquery.deferred/) that resolves when a server response is received after a login request. It provides the following convenient pattern to wait until the user's authentication state is known:

    user.signIn({});
    user.authenticate.then(function () {
        if (user.get('authenticated')) {
            // User is authenticated
        } else {
            // User is unathenticated
        }
    });

#### Authentication: Controller ####

**Listens to**: `signin`, `signout`, `unauthorized`
