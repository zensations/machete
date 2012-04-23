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
(function ($) {
  // Mexico object setup
  root = this;
  Mexico = {};
  Mexico.equipment = {};

  $(document).bind('mobileinit', function() {
    // Disable jQuery Mobile link and ajax handling
    $.mobile.ajaxEnabled = false;
    $.mobile.linkBindingEnabled = false;
    $.mobile.hashListeningEnabled = false;
    $.mobile.pushStateEnabled = false;
    $.mobile.buttonMarkup.hoverDelay = 0;

    // default configure header and toolbars to be fixed
    $.mobile.fixedtoolbar.prototype.options.updatePagePadding = false;
    $.mobile.fixedtoolbar.prototype.options.transition = 'none';
    $.mobile.fixedtoolbar.prototype.options.initSelector = ':jqmData(role="header"), :jqmData(role="footer")';
  });

  // Global store for transition/direction data caught from click events
  transition = false;
  reverse = false;

  // template cache
  templates = {};

  // movement stack, used for correct forward/backward handling
  stack = [];
  stackindex = -1;

  // block links while page transitions
  transitioning = false;
  $(document).bind('pagebeforeshow', function(){
    transitioning = true;
  });
  $(document).bind('pageshow', function(event, ui){
    $('[data-role="header", data-role="footer"]').fixedtoolbar('show');
    transitioning = false;
  });

  /**
   * Helper function to convert a JSON object into a
   * Mustache-compatible object -> simple arrays are
   * convertet into objects with one property "collection"
   * which holds the array.
   */
  mustachify = function (value) {
    var i;
    if (_.isArray(value)) {
      for (i = 0; i < value.length; i++) {
        value[i] = mustachify(value[i]);
      }
      value = { collection: value };
    }
    else if (_.isObject(value)) {
      for (i = 0; i < value.length; i++) {
        if ((_.isArray(value[i])) || (_.isObject(value[i]))) {
          value[i] = mustachify(value[i]);
        }
      }
    }
    else {
      value = { item: value };
    }
    return value;
  };

  /**
   * Base class for Machete's Equipment, that means resuable
   * parts on pages.
   */
  Mexico.Equipment = Backbone.View.extend({
    /**
     * Clean up event bindings. Equipment added to pages
     * is cleaned up and deleted automatically.
     */
    cleanup: function() {
      // clean up event bindings here ...
    }
  });

  /**
   * Simple Model storing Application Tabs.
   */
  Boot = Backbone.Model.extend({
    icon: false,
    text: 'Boot',
    route: '#',
    active: true
  });

  /**
   * Boots collection. Stores "Boots" (Application Tabs).
   * Use ... 
   * Mexico.boots.addBoot({
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
    },
  });

  // Global instance of boots-collection
  Mexico.boots = new Boots();

  /**
   * Register boots in equipment rooster. Every equipment has to be a
   * Class extending Mexico.Equipment. Use <div data-equipment="[boots]"/>
   * to include it.
   */
  Mexico.equipment.boots = Mexico.Equipment.extend({
    boots: [],
    collection: Mexico.boots,
    render: function() {
      this.$el = $('<div data-role="footer"><div data-role="navbar"><ul></ul></div></div>');
      var list = $('ul', this.$el);
      var that = this;
      this.collection.each(function(model) {
        var boot = new BootDisplay({model: model});
        that.boots.push(boot);
        list.append(boot.render().$el);
      });
      return this;
    },
    cleanup: function() {
      _.each(this.boot, function(boot) {
        boot.cleanup();
        delete boot;
      });
    }
  });

  /**
   * Bootdisplay, rendering one boot and listening to active-changes.
   */
  BootDisplay = Mexico.Equipment.extend({
    initialize: function() {
      _.bindAll(this);
      this.model.on('change:active', this.refreshActive);
    },
    render: function() {
      this.$el = $('<li><a href="#' + this.model.get('route') + '">'
                   + this.model.get('text') + '</a></li>');
      if (this.model.get('active')) {
        $('a', this.$el).addClass('ui-btn-active');
      }
      return this;
    },
    refreshActive: function() {
      if (this.model.get('active')) {
        $('a', this.$el).addClass('ui-btn-active');
      }
      else {
        $('a', this.$el).removeClass('ui-btn-active');
      }
    },
    cleanup: function() {
      this.model.unbind('change:active', this.refreshActive);
    }
  });

  /**
   * Helper function to grow a mustache - combine a template file
   * with a Backbone-Model.
   */
  Mexico.growMustache = function(mustache, data) {
    if (!templates.hasOwnProperty(mustache)) {
      templates[mustache] = Hogan.compile($.ajax({
        url: mustache,
        async: false
      }).responseText);
    }
    data = mustachify(data);
    return templates[mustache].render(data);
  };

  /**
   * Main Class for jQuery-Mobile pages. Handles appearing and
   * disposing, dom caching, transition click handling and
   * many more!
   */
  Mexico.Machete = Backbone.View.extend({

    // equipment machete is carrying
    equipment: {},

    // initalize - set up root element
    initialize: function() {
      this.$el = $('<div data-role="page"></div>');
    },

    // default rendering
    render: function() {
      this.$el.append('<div data-role="header"><h1>Machete!</h1></div>');
      return this;
    },

    /**
     * handles all clicks on "a" elements to provide jQuery-Mobile
     * functionality of data-transition, data-direction and data-rel="back".
     */
    handleClick: function (event) {
      if (transitioning) {
        event.preventDefault();
        return false;
      }
      var target = $(event.currentTarget);
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
    },

    /**
     * Makes Machete appear. Also adds equipment and handles dom-caching.
     */
    appear: function(options) {
      var options = _.extend({
        transition: transition,
        reverse: reverse,
        pageContainer: $.mobile.pageContainer
      }, options);
      // get the current fragment
      var fragment = Backbone.history.fragment;
      // set boots to active fragment
      Mexico.boots.setActive(fragment);

      // check if page with data-url already exists in the dom ...
      if ($('div:jqmData(url="' + fragment + '")').length > 0) {
        this.$el = $('div:jqmData(url="' + fragment + '")');
      }
      // ... else render it
      else {
        this.render();
        this.$el.attr('data-url', fragment);
        if (this.options.persist) {
          this.$el.attr('data-dom-cache', true);
        }
        var that = this;
        $('div[data-equipment]', this.$el).each(function() {
          var equipment = $(this).attr('data-equipment');
          that.equipment[equipment] = new Mexico.equipment[equipment];
          if (Mexico.equipment.hasOwnProperty(equipment)) {
            $(this).replaceWith(that.equipment[equipment].render().$el);
          }
        });
        $('a', this.$el).click(this.handleClick);
        $('body').append(this.$el);
      }
      if (stackindex > 0 && stack[stackindex - 1].fragment === fragment) {
        // new fragment points exactly one page back
        transition = stack[stackindex - 1].transition;
        stackindex--;
        options.reverse = !options.reverse;
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

      // adjust header and footer to be fixed and persistent
      $('div[data-role="header"]', this.$el).attr('data-id', 'machete-bandana');
      $('div[data-role="footer"]', this.$el).attr('data-id', 'machete-boots');
      this.$el.Machete = this;
      $.mobile.changePage(this.$el, options);
    },

    /**
     * Tells Machete to throw away equipment the moment he dissapears.
     * If overridden don't forget to call:
     * Mexico.Machete.prototype.cleanup.call(this);
     */
    cleanup: function() {
      // Clean up events bindings here ...
      // and don't forget to call super.dissapear!
      _.each(this.equipment, function(equipment){
        equipment.cleanup();
        delete equipment;
      });
    }
  });

  /**
   * Base Router, pointing to the "scout", the initial page,
   * if no hash is provided.
   */
  var Pardre = Backbone.Router.extend({
    routes: {
      'machete': 'machete',
      '': 'scout',
    },
    scout: function() {
      this.navigate(Mexico.scout, {trigger: true});
    },
    machete: function() {
      var machete = new Mexico.Machete();
      machete.render();
      machete.appear();
    }
  });
  
  /**
   * Tells Backbone to navigate to another page.
   * @param options object
   *   "transition" and "reverse" fields are used for jqmobile transitions,
   *   everything else is passed over to backbone.
   */
  Mexico.navigate = function(fragment, options) {
    options.trigger = true;
    if (options.hasOwnProperty('transition')) {
      transition = options.transition;
    }
    if (options.hasOwnProperty('reverse')) {
      reverse = options.reverse;
    }
    Backbone.history.navigate(fragment, options);
  };

  // set up the pardre to enable scouting
  pardre = new Pardre();

  // sets the scout to "machete", you will want to override this
  Mexico.scout = 'machete';

  // Delay application start until all resources have been loaded
  $(window).load(function() {
    Backbone.history.start();
  });

  // Delete unused pages if they are not marked as dom-cached
  $(document).bind('pageshow', function(event, ui) {
    if ($(ui.prevPage).attr('data-dom-cache') !== 'true') {
      if (typeof ui.prevPage.Machete !== 'undefined') {
        ui.prevPage.Machete.cleanup();
        delete ui.prevPage.Machete;
      }
      ui.prevPage.remove();
    }
  });

  // set global Mexico variable
  root.Mexico = Mexico;
}(jQuery));
