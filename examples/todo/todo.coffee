# ======================================================================
# MODELS & COLLECTIONS
# ======================================================================
class TodoItem extends Backbone.Model
  text: 'My Todo'
  done: false
  archived: false

class TodoItems extends Backbone.Collection
  model: TodoItem
  localStorage: new Backbone.LocalStorage 'items'

class TodoList extends Backbone.Model
  name: 'My List'
  initialize: ->
    @items = new TodoItems
    @items.fetch()

class TodoLists extends Backbone.Collection
  model: TodoList
  localStorage: new Backbone.LocalStorage('lists')

# ======================================================================
# VIEWS
# ======================================================================
class TodoListsView extends Mexico.Machete
  mustache: 'mustaches/todolists.mustache'

  render: ->
    @collection.each (list) =>
      @$('.lists').append (new TodoListsItem(model: list)).el

  events:
    'click .add-list': 'addList'
    'add @collection': 'listAdded'
    'destroy @collection': 'listRemoved'

  addList: (event) =>
    list = new TodoList(name:@$('input[name="list"]').val())
    @$('input[name="list"]').val('')
    @collection.add(list)
    list.save()
    event.preventDefault()
    return false

  listAdded: (list, collection) ->
    @$('.lists').append (new TodoListsItem(model: list)).el
    @$('.lists').listview('refresh')

  listRemoved: (list, collection) ->
    @$('.lists').listview('refresh')


class TodoListsItem extends Mexico.Mexican
  mustache: '''
    <li>
      <a href="#list/{{cid}}" data-transition="slide">{{name}}</a>
    </li>
  '''

  events:
    'destroy @model': -> $(this.el).remove()

  destroyed: ->
    $(this.el).remove()

class TodoListView extends Mexico.Machete
  mustache: 'mustaches/todolist.mustache'
  initialize: ->
    @model.items.on('add', @addedItem)

  render: ->
    @model.items.each (item) =>
      @$('.items').append (new TodoListItem model: item).el

  events:
    'click .remove-list': 'removeList'
    'click .add-item': 'addItem'

  addedItem: (item, collection) =>
    @$('.items').append (new TodoListItem model: item).el

  removeList: (event) ->
    @model.destroy()
    event.preventDefault()
    history.back()
    return false

  addItem: (event) ->
    todo = new TodoItem({text: @$('input[name="item"]').val()});
    @model.items.add(todo)
    todo.save()
    event.preventDefault()
    return false

class TodoListItem extends Mexico.Mexican
  mustache: '''
    <div>
      <input type="checkbox" name="checkbox-{{cid}}" id="checkbox-{{cid}}" class="custom" />
      <label for="checkbox-{{cid}}">{{text}}</label>
    </div>
  '''

# ======================================================================
# ROUTER
# ======================================================================
class TodoApp extends Backbone.Router
  routes:
    'lists': 'lists'
    'list/:cid': 'list'

  lists: ->
    (new TodoListsView(collection:todolists, persist: true).appear())

  list: (cid) ->
    (new TodoListView(model:todolists.getByCid cid).appear())

# ======================================================================
# RUN PROGRAM
# ======================================================================
todolists = new TodoLists
todolists.fetch()
Mexico.scout = 'lists'
todo = new TodoApp
