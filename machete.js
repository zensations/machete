/*
 * Copyright (c) 2012 Philipp Melab
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
 * ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
(function($) {
  $ = jQuery;
  // Machete object setup
  var root = this;
  var Machete = {};
  root.Machete = Machete;

  // noConflict
  var previousMachete = root.Machete;
  Machete.noConflict = function() {
    root.Machete = previousMachete;
    return Machete;
  };

  // Machete plugin handling
  Machete.equipment = {};

  // ======================================================================
  // Machete doesn't text ... but he communicates.
  // Functions for loading and status messages.
  // ======================================================================
  /**
   * Machete shouts out in anger!
   * And delivers useful messages to your user.
   * @message string
   *   the message to be delivered to the user
   */
  Machete.shout = function (message, callback, theme) {
    if (!theme) {
      theme = 'e';
    }
    $.mobile.showPageLoadingMsg(theme, message, true);
    window.setTimeout(function(){
      $.mobile.hidePageLoadingMsg();
      if(typeof callback !== 'undefined') {
        callback();
      }
    }, 1500);
  };

  var overruleMsgHide = false;
  $.mobile.hidePageLoadingMsg = _.wrap($.mobile.hidePageLoadingMsg, function(func){
    if (!overruleMsgHide) {
      func();
    }
  });

  Machete.searching = function (message) {
    if (!message) {
      message = 'Loading ...';
    }
    $.mobile.showPageLoadingMsg('c', message, false);
    overruleMsgHide = true;
  };

  Machete.found = function() {
    overruleMsgHide = false;
    $.mobile.hidePageLoadingMsg();
  };


  // ======================================================================
  // Link handling
  // Provide transition and stack information for Backbone.js
  // ======================================================================
  // Global store for transition/direction data caught from click events
  var transition = false;
  var reverse = false;
  var transitioning = false;

  /**
   * Handle all click events to provide jQuery mobile standard functionality.
   */
  $(document).bind('tap', function macheteRun(event) {
    if (transitioning) {
      event.preventDefault();
      return false;
    }
    var link = event.target;
    while ( link ) {
      if ((typeof link.nodeName === "string") && link.nodeName.toLowerCase() == "a") {
        break;
      }
      link = link.parentNode;
    }
    var target = $(link);
    if (target.parents(':jqmData(role="dialog")').length > 0) {
      return true;
    }
    if (target.jqmData('rel') === 'back') {
      history.back();
      event.preventDefault();
      return false;
    }
    if (!target.attr('href') || target.attr('href') === '#') {
      return;
    }
    else {
      transition = target.jqmData('transition');
      reverse = target.jqmData('direction') === 'reverse';
    }
  });

  // block links while page transitions
  $(document).bind('pagebeforeshow', function(){
    transitioning = true;
  });

  $(document).bind('pageshow', function(event, ui){
    transitioning = false;
  });

  // movement stack, used for correct forward/backward handling
  var stack = [];
  stackindex = -1;

  /**
   * Main run function.
   */
  Machete.run = function(options) {
    options.reverse = false;
    var fragment = Backbone.history.fragment;

    // stack handling - adjust transition and direction
    if (stackindex > 0 && stack[stackindex - 1].fragment === fragment) {
      // new fragment points exactly one page back
      transition = stack[stackindex].transition;
      reverse = !stack[stackindex].reverse;
      stackindex--;
    } else if (stackindex < stack.length - 1 && stack[stackindex + 1] === fragment) {
      // new fragment points to the last visited page (forward)
      transition = stack[stackindex + 1].transition;
      stackindex++;
    } else if (!(stackindex == stack.length - 1 && stack[stackindex - 1] === fragment)) {
      // completely new page, chop head of stack 
      stackindex++;
      stack = stack.slice(0, stackindex);
      stack.push({fragment: Backbone.history.fragment, transition: transition});
    }


    var cpopts = _.extend({
      transition: transition,
      reverse: reverse,
      showLoadMsg: false
    });

    if ($(':jqmData(url="' + fragment + '")').length > 0) {
      $.mobile.changePage($(':jqmData(url="' + fragment + '")'), cpopts);
      return;
    }

    var opts = _.extend({
      bandana: BandanaDisplay,
      vest: Machete.Vest,
      boots: BootsDisplay,
      options: {}
    }, options);

    $page = $('<div data-role="page" data-url="' + fragment + '"></div>');
    var path = fragment.split('/');
    var classes = [];
    while(path.length > 0) {
      classes.push(path.join('-'));
      path.pop();
    }
    _.each(classes, function(c){
      $page.addClass(c);
    });

    if (options.persist) {
      $page.attr('data-dom-cache', 'true');
    }


    if (opts.bandana) {
      var bandana = new opts.bandana();
      bandana.render();
      $page.append(bandana.el);
    }

    var vest = new opts.vest(opts.options);
    vest.render();
    $page.append(vest.el);


    if (opts.boots) {
      var boots = new opts.boots();
      boots.render();
      $page.append(boots.el);
    }

    $.mobile.pageContainer.prepend($page);
    $page.page();
    $.mobile.changePage($page, cpopts);
  };

  // ======================================================================
  // Views
  // Machete.Gear base class
  // ======================================================================
  // mustache and html-template cache
  var templates = {};
  var mustaches = {};

  function _growMustache(mustache) {
    if (!_.has(mustaches, mustache)) {
      if (mustache.match(/.*\.mustache/)) {
        mustaches[mustache] = Hogan.compile($.ajax({
          url: mustache,
          async: false
        }).responseText);
      }
      else {
        mustaches[mustache] = Hogan.compile(mustache);
      }
    }
    return mustaches[mustache];
  }

  function _getTemplate(template) {
    if (template.match(/.*\.html/)) {
      if (!_.has(templates, template)) {
        templates[template] = $.ajax({
          url: template,
          async: false
        }).responseText;
      }
      return templates[template];
    }
    else {
      return template;
    }
  }

  /**
   * Base class for Machete's gear, aka. Widgets.
   */
  Machete.Gear = Backbone.View.extend({
    template: '<div></div>',
    mustache: false,
    briefing: false,
    timer: 0,

    _ensureElement: function() {
      _.bindAll(this);
      if (this.options.mustache) {
        this.mustache = this.options.mustache;
      }
      if (this.options.template) {
        this.template = this.options.template;
      }
      var briefing = this.brief();
      if (this.mustache && !(_.has(briefing, 'resolve'))) {
        this.setElement(_growMustache(this.mustache).render(briefing), false);
      }
      else {
        this.briefing = briefing;
        this.setElement(_getTemplate(this.template), false);
      }
      if (_.has(briefing, 'resolve')) {
        this.timer = (new Date()).getTime();
        briefing.done(this._deferredBriefing);
      }
      $(document).trigger('machetebriefed', this);
      this.el.Gear = this;
      $(this.el).addClass('gear');
    },

    _deferredBriefing: function(briefing) {
      this.briefing = briefing;
      var content = $(_growMustache(this.mustache).render(briefing));
      this.$el.empty();
      this.$el.append(content.children());
      this.$el.hide();
      this.delegateEvents();
      this.render();
      this.$el.trigger('create');
      $(document).trigger('machetebriefed', this);
      this.$el.fadeIn();
    },

    /**
     * Prepare data for Machete.
     */
    brief: function() {
      var data = {};
      if (this.model) {
        data = this.model.toJSON();
        if (!_.has(data, 'cid')) {
          data.cid = this.model.cid;
        }
      }
      return data;
    },

    remind: function() {
      var briefing = this.brief();
      if (_.has(briefing, 'resolve')) {
        briefing.done(this._deferredBriefing);
      }
      else {
        this._deferredBriefing(briefing);
      }
    },

    delegateEvents: function (events) {
      if (this.delegated) {
        return;
      }
      Backbone.View.prototype.delegateEvents.call(this, events);
      if (!(events || (events = this.events))) {
        return;
      }
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) {
          method = this[events[key]];
        }
        if (!method) {
          throw new Error('Method "' + events[key] + '" does not exist');
        }
        var match = key.match(/^(\S+)\s*@(.*)$/);
        if (!match) {
          continue;
        }
        var property = match[2];
        var event = match[1];
        if (!_.has(this, property)) { 
          throw new Error('Property "' + property + '" does not exist');
        }
        method = _.bind(method, this);
        this.delegatedPropertyEvents.push({
          property: property,
          event: event,
          method: method
        });
        this[property].on(event, method);
      }
    },

    undelegateEvents: function () {
      Backbone.View.prototype.undelegateEvents.call(this);
      if (!this.delegatedPropertyEvents) {
        this.delegatedPropertyEvents = [];
      }
      var delegation = this.delegatedPropertyEvents.pop();
      while(delegation) {
        this[delegation.property].unbind(delegation.event, delegation.method);
        delegation = this.delegatedPropertyEvents.pop();
      }
    },

    eliminate: function() {
      this.undelegateEvents();
    }
  });

  // ======================================================================
  // Machete.Vest
  // ======================================================================
  /**
   * Machete's default vest.
   * Simple content page with an important warning.
   */
  Machete.Vest = Machete.Gear.extend({
    template: '<div data-role="content"></div>',
    /**
     * Provide default values for the bandana.
     */
    bandana: function() {
      return {
        title: 'Loading ...',
        route: false,
        icon: false,
        text: false,
        transition: false
      };
    }
  });

  // ======================================================================
  // Machete.Bandana
  // ======================================================================
  var Bandana = Backbone.Model.extend({
    title: 'Machete',
    back: false,
    route: false,
    icon: false,
    text: false,
    transition: false
  });

  Machete.bandana = new Bandana();

  var BandanaDisplay = Machete.Gear.extend({
    template: '<div data-role="header" data-position="fixed" data-id="machete-bandana"><h1>Machete</h1></div>',
    events: {
      'change @model': 'render'
    },
    initialize: function() {
      this.model = Machete.bandana;
    },
    render: function() {
      this.$('.back').remove();
      this.$('.action').remove();
      if (this.model.get('back')) {
        this.$el.append('<a class="back ui-btn-left" data-rel="back" data-icon="arrow-l">Back</a>').trigger('create');
      }
      else {
        this.$('.back').remove();
      }
      this.$('h1').text(this.model.get('title'));
      var route = this.model.get('route');
      var icon = this.model.get('icon');
      var text = this.model.get('text');
      var transition = this.model.get('transition');
      $action = false;
      if (route && (icon || text)) {
        $action = $('<a class="ui-btn-right action">Action</a>')
          .attr('href', route)
          .attr('data-transition', transition);
        if (icon) {
          $action.attr('data-icon', icon);
          $action.attr('data-iconpos', 'right');
        }
        if (text) {
          $action.text(text);
        }
        else {
          $action.attr('data-iconpos', 'notext');
        }
      }
      if ($action) {
        this.$el.append($action).trigger('create');
      }
    }
  });

  function refreshBandana(gear) {
    if(gear && _.has(gear, 'bandana') && _.isFunction(gear.bandana)) {
      Machete.bandana.set(_.extend({
        title: 'Machete',
        route: false,
        text: false,
        icon: false
      }, gear.bandana(), {back: (stackindex > 0)}));
    }
  }

  $(document).bind('machetebriefed', function(doc, gear) {
    refreshBandana(gear);
  });

  $(document).bind('pagehide', function(event, ui){
    var vest = $(':jqmData(role="content")', ui.nextPage);
    if (vest.length > 0 && vest[0].Gear) {
      refreshBandana(vest[0].Gear);
    }
  });

  // ======================================================================
  // Machete.Boots
  // ======================================================================
  /**
   * Simple Model storing Application Tabs.
   */
  Boot = Backbone.Model.extend({
    title: 'Machete',
    action: false
  });

  /**
   * Boots collection. Stores "Boots" (Application Tabs).
   * Use ... 
   * Machete.boots.addBoot({
   *   text: [tab-text],
   *   icon: [tab-icon],
   *   route: [route (without the hash)]
   * });
   * ... to add new routes.
   * TODO: Handle runtime modified routes.
   */
  var Boots = Backbone.Collection.extend({
    /**
     * Takes an fragment and tests all boots in collection if they point there.
     * If one matches, it will be set active and all others inactive.
     * If none matches, nothing happens.
     */
    setActive: function(fragment) {
      if (this.any(function(boot) { return (boot.get('route') === fragment); })) {
        this.each(function(boot) {
          boot.set('active', (boot.get('route') === fragment));
        });
      }
    },

    /**
     * Add a boot to Machete's shoecase.
     */
    addBoot: function(configuration) {
      this.add(new Boot(configuration));
    }
  });

  // Global instance of boots-collection
  Machete.boots = new Boots();

  /**
   * Register boots in equipment rooster. Every equipment has to be a
   * Class extending Machete.Equipment. Use <div data-equipment="[boots]"/>
   * to include it.
   */
  var BootsDisplay = Machete.Gear.extend({
    collection: Machete.boots,
    mustache: '<div data-role="footer" id="boots" data-position="fixed" data-id="machete-boots"><div data-role="navbar"><ul></ul></div></div>',
    render: function() {
      var list = this.$('ul');
      this.collection.each(function(model) {
        list.append(new BootDisplay({model: model}).render().el);
      });
      return this;
    }
  });

  /**
   * Bootdisplay, rendering one boot and listening to active-changes.
   */
  BootDisplay = Machete.Gear.extend({
    mustache: '<li><a data-icon="{{icon}}" data-iconpos="notext" href="#{{route}}">{{text}}</a></li>',
    events: {
      'change:active @model': 'refreshActive',
      'click a': 'resetStack'
    },
    resetStack: function() {
      stackindex = -1;
    },
    render: function() {
      if (this.model.get('active')) {
        this.$('a').addClass('ui-btn-active');
      }
      return this;
    },
    refreshActive: function() {
      if (this.model.get('active')) {
        this.$('a').addClass('ui-btn-active');
      }
      else {
        this.$('a').removeClass('ui-btn-active');
      }
    }
  });

  $(document).bind('pagebeforeshow', function(event, ui) {
    // set boots to active fragment
    Machete.boots.setActive(Backbone.history.fragment);
  });

  // ======================================================================
  // Routing
  // ======================================================================
  /**
   * Tells Backbone to navigate to another page.
   * @param options object
   *   "transition" and "reverse" fields are used for jqmobile transitions,
   *   everything else is passed over to backbone.
   */
  Machete.navigate = function(fragment, options) {
    if (!options) {
      options = {};
    }
    options.trigger = true;
    if (_.has(options, 'transition')) {
      transition = options.transition;
    }
    if (_.has(options, 'reverse')) {
      reverse = options.reverse;
    }
    Backbone.history.navigate(fragment, options);
  };

  // sets the scout to "machete", you will want to override this
  Machete.scout = 'machete';

  /**
   * Base Router, pointing to the "scout", the initial page,
   * if no hash is provided.
   */
  var Pardre = Backbone.Router.extend({
    routes: {
      'machete': 'machete',
      '': 'scout'
    },
    scout: function() {
      this.navigate(Machete.scout, {trigger: true});
    },
    machete: function() {
      Machete.run({
        vest: Machete.vest
      });
    }
  });

  // set up the pardre to enable scouting
  pardre = new Pardre();

  // Delay application start until all resources have been loaded
  $(window).load(function() {
    Backbone.history.start();
  });

  // Delete unused pages if they are not marked as dom-cached
  $(document).bind('pageshow', function(event, ui) {
    if ($(ui.prevPage).attr('data-role') === 'page' && $(ui.prevPage).attr('data-dom-cache') !== 'true') {
      ui.prevPage.remove();
    }
  });

  // ======================================================================
  // MACHETE JQUERY DOM MANIPULATION OVERRIDES
  // ======================================================================
  // override jquery methods which delete elements to trigger proper cleanup
  // behavior
  _eliminateElement = function (elem) {
    if (_(elem[0]).isObject() && _(elem[0]).has('Gear')) {
      elem[0].Gear.eliminate();
    }
    $('.gear', elem).each(function() {
      this.Gear.eliminate();
    });
  };

  var macheteRemove = $.fn.remove;
  $.fn.remove = function (selector, keepData) {
    _eliminateElement(this);
    return macheteRemove.call(this, selector, keepData);
  };

  var macheteEmpty = $.fn.empty;
  $.fn.empty = function () {
    _eliminateElement(this);
    return macheteEmpty.call(this);
  };

  var macheteReplaceWith = $.fn.replaceWith;
  $.fn.replaceWith = function (value) {
    _eliminateElement(this);
    return macheteReplaceWith.call(this, value);
  };
  return Machete;
}(jQuery));
