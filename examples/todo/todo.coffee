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
class TodoListView extends Mexico.Machete
  mustache: 'mustaches/todolist.mustache'

  render: ->
    @collection.each (item) =>
      @$('.items').append((new TodoListItem(model:item)).render().el)
    return this

  events:
    'click .add-item': 'addItem'
    'add @collection': 'renderList'
    'destroy @collection': 'renderList'

  renderList: ->
    @$('.items').children().remove()
    @collection.each (item) =>
      @$('.items').append((new TodoListItem(model:item)).render().el)
    @$el.trigger('create')

  addItem: (event) =>
    item = new TodoItem(text:@$('input[name="item"]').val())
    @$('input[name="item"]').val('')
    @collection.add(item)
    item.save()
    event.preventDefault()
    return false

class TodoListItem extends Mexico.Mexican
  initialize: ->
    @box = @$('input[type="checkbox"]')

  mustache: 'mustaches/todolistitem.mustache'

  events:
    'change input[type="checkbox"]': 'mark'

  mark: (event) ->
    @model.set('done', @box.is(':checked'))
    @model.save()
    event.preventDefault()
    @render()
    return false

  render: ->
    if @model.get('done')
      @box.attr('checked', 'checked')
      @box.changeColorSwatch('c', 'theme')
    else
      @box.changeColorSwatch('e', 'theme')
    return this

# ======================================================================
# ROUTER
# ======================================================================
class Todo extends Backbone.Router
  routes:
    'todo': 'todo'
  todo: ->
    (new TodoListView(collection:todolist)).render().appear(transition: 'none')

# ======================================================================
# RUN PROGRAM
# ======================================================================
Mexico.scout = 'todo'
todo = new Todo
