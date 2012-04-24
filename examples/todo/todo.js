(function() {
  var TodoApp, TodoItem, TodoList, TodoListItem, TodoListView, TodoLists, TodoListsItem, TodoListsView, datastore, todo, todolists,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  TodoItem = (function(_super) {

    __extends(TodoItem, _super);

    function TodoItem() {
      TodoItem.__super__.constructor.apply(this, arguments);
    }

    TodoItem.prototype.text = 'My Todo';

    TodoItem.prototype.done = false;

    TodoItem.prototype.archived = false;

    return TodoItem;

  })(Backbone.Model);

  TodoList = (function(_super) {

    __extends(TodoList, _super);

    function TodoList() {
      TodoList.__super__.constructor.apply(this, arguments);
    }

    TodoList.prototype.name = 'My List';

    TodoList.prototype.initialize = function() {
      var Store, id;
      id = this.get('name');
      Store = (function(_super2) {

        __extends(Store, _super2);

        function Store() {
          Store.__super__.constructor.apply(this, arguments);
        }

        Store.prototype.mode = TodoList;

        Store.prototype.localStorage = new Backbone.LocalStorage('list-' + id);

        return Store;

      })(Backbone.Collection);
      this.items = new Store;
      return this.items.fetch();
    };

    return TodoList;

  })(Backbone.Model);

  TodoLists = (function(_super) {

    __extends(TodoLists, _super);

    function TodoLists() {
      TodoLists.__super__.constructor.apply(this, arguments);
    }

    TodoLists.prototype.model = TodoList;

    TodoLists.prototype.localStorage = new Backbone.LocalStorage('lists');

    return TodoLists;

  })(Backbone.Collection);

  TodoListsView = (function(_super) {

    __extends(TodoListsView, _super);

    function TodoListsView() {
      this.addList = __bind(this.addList, this);
      TodoListsView.__super__.constructor.apply(this, arguments);
    }

    TodoListsView.prototype.mustache = 'mustaches/todolists.mustache';

    TodoListsView.prototype.render = function() {
      var _this = this;
      this.collection.each(function(list) {
        return _this.$('.lists').append((new TodoListsItem({
          model: list
        })).render().el);
      });
      return this;
    };

    TodoListsView.prototype.events = {
      'click .add-list': 'addList',
      'add @collection': 'listAdded',
      'destroy @collection': 'listRemoved'
    };

    TodoListsView.prototype.addList = function(event) {
      var list;
      list = new TodoList({
        name: this.$('input[name="list"]').val()
      });
      this.$('input[name="list"]').val('');
      this.collection.add(list);
      list.save();
      event.preventDefault();
      return false;
    };

    TodoListsView.prototype.listAdded = function(list, collection) {
      this.$('.lists').append((new TodoListsItem({
        model: list
      })).render().el);
      return this.$('.lists').listview('refresh');
    };

    TodoListsView.prototype.listRemoved = function(list, collection) {
      this.$('.lists').empty();
      this.render();
      return $(this.el).trigger('create');
    };

    return TodoListsView;

  })(Mexico.Machete);

  TodoListsItem = (function(_super) {

    __extends(TodoListsItem, _super);

    function TodoListsItem() {
      TodoListsItem.__super__.constructor.apply(this, arguments);
    }

    TodoListsItem.prototype.mustache = '<li>\n  <a href="#list/{{cid}}" data-transition="slide">{{name}}</a>\n</li>';

    TodoListsItem.prototype.events = {
      'destroy @model': function() {
        return $(this.el).remove();
      }
    };

    TodoListsItem.prototype.destroyed = function() {
      return $(this.el).remove();
    };

    return TodoListsItem;

  })(Mexico.Mexican);

  TodoListView = (function(_super) {

    __extends(TodoListView, _super);

    function TodoListView() {
      this.addedItem = __bind(this.addedItem, this);
      TodoListView.__super__.constructor.apply(this, arguments);
    }

    TodoListView.prototype.mustache = 'mustaches/todolist.mustache';

    TodoListView.prototype.initialize = function() {
      return this.model.items.on('add', this.addedItem);
    };

    TodoListView.prototype.render = function() {
      var _this = this;
      this.model.items.each(function(item) {
        return _this.$('.items').append((new TodoListItem({
          model: item
        })).render().el);
      });
      return this;
    };

    TodoListView.prototype.events = {
      'click .remove-list': 'removeList',
      'click .add-item': 'addItem'
    };

    TodoListView.prototype.addedItem = function(item, collection) {
      item = new TodoListItem({
        model: item
      });
      this.$('.items').empty();
      this.render();
      return $(this.el).trigger('create');
    };

    TodoListView.prototype.removeList = function(event) {
      this.model.destroy();
      event.preventDefault();
      history.back();
      return false;
    };

    TodoListView.prototype.addItem = function(event) {
      var todo;
      todo = new TodoItem({
        text: this.$('input[name="item"]').val()
      });
      this.model.items.add(todo);
      todo.save();
      event.preventDefault();
      return false;
    };

    return TodoListView;

  })(Mexico.Machete);

  TodoListItem = (function(_super) {

    __extends(TodoListItem, _super);

    function TodoListItem() {
      TodoListItem.__super__.constructor.apply(this, arguments);
    }

    TodoListItem.prototype.mustache = '<div>\n  <input type="checkbox" data-mini="true" name="checkbox-{{cid}}" id="checkbox-{{cid}}" class="custom" />\n  <label for="checkbox-{{cid}}">{{text}}</label>\n</div>';

    TodoListItem.prototype.events = {
      'change input[type="checkbox"]': 'mark'
    };

    TodoListItem.prototype.mark = function(event) {
      this.model.set('done', this.$('input[type="checkbox"]:checked').length);
      this.model.save();
      event.preventDefault();
      return false;
    };

    TodoListItem.prototype.render = function() {
      if (this.model.get('done')) {
        this.$('input[type="checkbox"]').attr('checked', 'checked');
      }
      return this;
    };

    return TodoListItem;

  })(Mexico.Mexican);

  TodoApp = (function(_super) {

    __extends(TodoApp, _super);

    function TodoApp() {
      TodoApp.__super__.constructor.apply(this, arguments);
    }

    TodoApp.prototype.routes = {
      'lists': 'lists',
      'list/:cid': 'list'
    };

    TodoApp.prototype.lists = function() {
      return (new TodoListsView({
        collection: todolists,
        persist: true
      })).render().appear();
    };

    TodoApp.prototype.list = function(cid) {
      return (new TodoListView({
        model: todolists.getByCid(cid)
      })).render().appear();
    };

    return TodoApp;

  })(Backbone.Router);

  todolists = new TodoLists;

  datastore = {};

  todolists.fetch();

  Mexico.scout = 'lists';

  todo = new TodoApp;

}).call(this);
