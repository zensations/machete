# ======================================================================
# MODELS & COLLECTIONS
# ======================================================================
class TodoItem extends Backbone.Model
  text: 'My Todo'
  done: false
  archived: false

class TodoList extends Backbone.Model
  name: 'My List'
  initialize: ->
    id = @get('name')
    class Store extends Backbone.Collection
      mode: TodoList
      localStorage: new Backbone.LocalStorage('list-' + id)
    @items = new Store
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
      @$('.lists').append (new TodoListsItem(model: list)).render().el
    return this

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
    @$('.lists').append (new TodoListsItem(model: list)).render().el
    @$('.lists').listview('refresh')

  listRemoved: (list, collection) ->
    @$('.lists').empty()
    @render()
    $(@el).trigger('create')


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
      @$('.items').append (new TodoListItem model: item).render().el
    return this

  events:
    'click .remove-list': 'removeList'
    'click .add-item': 'addItem'

  addedItem: (item, collection) =>
    item = new TodoListItem model: item
    @$('.items').empty()
    @render()
    $(@el).trigger('create')

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
      <input type="checkbox" data-mini="true" name="checkbox-{{cid}}" id="checkbox-{{cid}}" class="custom" />
      <label for="checkbox-{{cid}}">{{text}}</label>
    </div>
  '''

  events:
    'change input[type="checkbox"]': 'mark'

  mark: (event) ->
    @model.set('done', @$('input[type="checkbox"]:checked').length)
    @model.save()
    event.preventDefault()
    return false

  render: ->
    if @model.get('done')
      @$('input[type="checkbox"]').attr('checked', 'checked')
    return this

# ======================================================================
# ROUTER
# ======================================================================
class TodoApp extends Backbone.Router
  routes:
    'lists': 'lists'
    'list/:cid': 'list'

  lists: ->
    (new TodoListsView(collection:todolists, persist: true)).render().appear()

  list: (cid) ->
    (new TodoListView(model:todolists.getByCid cid)).render().appear()

# ======================================================================
# RUN PROGRAM
# ======================================================================
todolists = new TodoLists
datastore = {}
todolists.fetch()
Mexico.scout = 'lists'
todo = new TodoApp
