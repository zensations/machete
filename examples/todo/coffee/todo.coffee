# ======================================================================
# MODELS & COLLECTIONS
# ======================================================================
class TodoItem extends Backbone.Model
  text: false
  done: false
  archived: false

class TodoList extends Backbone.Collection
  model: TodoItem
  localStorage: new Backbone.LocalStorage('todo')

todolist = new TodoList
todolist.fetch()

# ======================================================================
# VIEWS
# ======================================================================
class TodoInfoView extends Machete.Gear
  template: 'mustaches/info.html'

class TodoListView extends Machete.Gear
  template: 'mustaches/todolist.html'

  render: ->
    @collection.each (item) =>
      @$('.items').append (new TodoListItem(model:item)).el
    return this

  events:
    'click .add-item': 'addItem'
    'add @collection': 'renderList'
    'destroy @collection': 'renderList'

  renderList: ->
    @$('.items').children().remove()
    @collection.each (item) =>
      @$('.items').append (new TodoListItem(model:item)).el
    @$el.trigger('create')

  addItem: (event) =>
    item = new TodoItem(text:@$('input[name="item"]').val())
    @collection.add(item)
    item.save()
    @$('input[name="item"]').val('')
    event.preventDefault()
    return false

class TodoListItem extends Machete.Gear
  mustache: 'mustaches/todolistitem.mustache'

  initialize: ->
    @box = @$('input[type="checkbox"]')

  events:
    'change input[type="checkbox"]': 'mark'

  mark: (event) ->
    @model.set('done', @box.is(':checked'))
    @model.save()
    event.preventDefault()
    return false

  render: ->
    if @model.get('done')
      @box.attr('checked', 'checked')
    else
      @box.removeAttr('checked')
    return this

# ======================================================================
# ROUTER
# ======================================================================
Machete.boots.add
  text: 'List'
  route: 'todo'

Machete.boots.add
  text: 'Info'
  route: 'info'

class Todo extends Backbone.Router
  routes:
    'todo': 'todo'
    'info': 'info'
  info: ->
    Machete.run
      vest: TodoInfoView
  todo: ->
    Machete.run
      vest: TodoListView
      options:
        collection: todolist

# ======================================================================
# RUN PROGRAM
# ======================================================================
Machete.scout = 'todo'
todo = new Todo
