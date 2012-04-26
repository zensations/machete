(function() {
  var Todo, TodoItem, TodoList, TodoListItem, TodoListView, todo, todolist,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  TodoItem = (function(_super) {

    __extends(TodoItem, _super);

    function TodoItem() {
      TodoItem.__super__.constructor.apply(this, arguments);
    }

    TodoItem.prototype.text = false;

    TodoItem.prototype.done = false;

    TodoItem.prototype.archived = false;

    return TodoItem;

  })(Backbone.Model);

  TodoList = (function(_super) {

    __extends(TodoList, _super);

    function TodoList() {
      TodoList.__super__.constructor.apply(this, arguments);
    }

    TodoList.prototype.model = TodoItem;

    TodoList.prototype.localStorage = new Backbone.LocalStorage('todo');

    return TodoList;

  })(Backbone.Collection);

  todolist = new TodoList;

  todolist.fetch();

  TodoListView = (function(_super) {

    __extends(TodoListView, _super);

    function TodoListView() {
      this.addItem = __bind(this.addItem, this);
      TodoListView.__super__.constructor.apply(this, arguments);
    }

    TodoListView.prototype.mustache = 'mustaches/todolist.mustache';

    TodoListView.prototype.render = function() {
      var _this = this;
      this.collection.each(function(item) {
        return _this.$('.items').append((new TodoListItem({
          model: item
        })).render().el);
      });
      return this;
    };

    TodoListView.prototype.events = {
      'click .add-item': 'addItem',
      'add @collection': 'renderList',
      'destroy @collection': 'renderList'
    };

    TodoListView.prototype.renderList = function() {
      var _this = this;
      this.$('.items').children().remove();
      this.collection.each(function(item) {
        return _this.$('.items').append((new TodoListItem({
          model: item
        })).render().el);
      });
      return this.$el.trigger('create');
    };

    TodoListView.prototype.addItem = function(event) {
      var item;
      item = new TodoItem({
        text: this.$('input[name="item"]').val()
      });
      this.$('input[name="item"]').val('');
      this.collection.add(item);
      item.save();
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

    TodoListItem.prototype.mustache = 'mustaches/todolistitem.mustache';

    TodoListItem.prototype.initialize = function() {
      return this.box = this.$('input[type="checkbox"]');
    };

    TodoListItem.prototype.events = {
      'change input[type="checkbox"]': 'mark'
    };

    TodoListItem.prototype.mark = function(event) {
      this.model.set('done', this.box.is(':checked'));
      this.model.save();
      event.preventDefault();
      this.render();
      return false;
    };

    TodoListItem.prototype.render = function() {
      if (this.model.get('done')) {
        this.box.attr('checked', 'checked');
      } else {
        this.box.removeAttr('checked');
      }
      return this;
    };

    return TodoListItem;

  })(Mexico.Mexican);

  Todo = (function(_super) {

    __extends(Todo, _super);

    function Todo() {
      Todo.__super__.constructor.apply(this, arguments);
    }

    Todo.prototype.routes = {
      'todo': 'todo'
    };

    Todo.prototype.todo = function() {
      return (new TodoListView({
        collection: todolist
      })).render().appear({
        transition: 'none'
      });
    };

    return Todo;

  })(Backbone.Router);

  Mexico.scout = 'todo';

  todo = new Todo;

}).call(this);
