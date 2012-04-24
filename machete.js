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
  var root = this;
  var Mexico = {};
  root.Mexico = Mexico;

  // noConflict
  var previousMexico = root.Mexico;
  Mexico.noConflict = function() {
    root.Mexico = previousMexico;
    return Mexico;
  };

  // Machete plugin handling
  Mexico.equipment = {};

  // bind mobileinit and reconfigure jquery mobile defaults
  $(document).bind('mobileinit', function() {
    // Disable jQuery Mobile link and ajax handling
    $.extend($.mobile, {
      ajaxEnabled: false,
      linkBindingEnabled: false,
      hashListeningEnabled: false,
      pushStateEnabled: false
    });
    $.mobile.buttonMarkup.hoverDelay = 0;

    // default configure header and toolbars to be fixed
    $.extend($.mobile.fixedtoolbar.prototype.options, {
      updatePagePadding: false,
      transition: 'none',
      initSelector: ':jqmData(role="header"), :jqmData(role="footer")'
    });
  });

  // Global store for transition/direction data caught from click events
  var transition = false;
  var reverse = false;

  /**
   * Handle all click events to provide jQuery mobile standard functionality.
   */
  $('a').live('click', function (event) {
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
  });
  // block links while page transitions
  var transitioning = false;
  $(document).bind('pagebeforeshow', function(){
    transitioning = true;
  });
  $(document).bind('pageshow', function(event, ui){
    $('[data-role="header", data-role="footer"]').fixedtoolbar('show');
    transitioning = false;
  });

  // used to split property-targeted events
  var delegatePropertyEventSplitter = /^(\S+)\s*@(.*)$/


  // mustache template cache
  var templates = {};

  /**
   * Base class for Mexicans.
   */
  Mexico.Mexican = Backbone.View.extend({
    mustache: false,
    _ensureElement: function() {
      if (this.mustache) {
        // if there is a mustache, use it as backbone base element ...
        if (!_.has(templates, this.mustache)) {
          if (this.mustache.match(/.*\.mustache/)) {
            templates[this.mustache] = Hogan.compile($.ajax({
              url: this.mustache,
              async: false
            }).responseText);
          }
          else {
            templates[this.mustache] = Hogan.compile(this.mustache);
          }
        }
        // and apply if the mexican has a model, use it to fill in data.
        var data = {};
        if (_.has(this, 'model')) {
          data = this.model.toJSON();
          if (!_.has(data, 'cid')) {
            data.cid = this.model.cid;
          }
        }
        // call backbone.setElement
        this.setElement(templates[this.mustache].render(data), false);
        this.el.Mexican = this;
        $(this.el).addClass('mexican');
      }
      else {
        Backbone.View.prototype._ensureElement.call(this);
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
        var match = key.match(delegatePropertyEventSplitter);
        if (!match) {
          continue;
        }
        var property = match[2];
        var event = match[1];
        if (!_.has(this, property)) { 
          throw new Error('Property "' + events[key] + '" does not exist');
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
      var delegation = null;
      if (!this.delegatedPropertyEvents) {
        this.delegatedPropertyEvents = [];
      }
      while(delegation = this.delegatedPropertyEvents.pop()) {
        this[delegation.property].unbind(delegation.event, delegation.method);
      }
    },

    /**
     *
     */
    eliminate: function() {
      this.undelegateEvents();
    }
  });

  // movement stack, used for correct forward/backward handling
  var stack = [];
  stackindex = -1;

  /**
   * Main Class for jQuery-Mobile pages. Handles appearing and
   * disposing, dom caching, transition click handling and
   * many more!
   */
  Mexico.Machete = Mexico.Mexican.extend({

    _ensureElement: function() {
      var fragment = Backbone.history.fragment;
      if ($('div:jqmData(url="' + fragment + '")').length > 0) {
        this.setElement($('div:jqmData(url="' + fragment + '")'), false);
        this.delegated = true;
      }
      else {
        Mexico.Mexican.prototype._ensureElement.call(this);
        $.mobile.pageContainer.append(this.el);
        // get the current fragment
        var fragment = Backbone.history.fragment;
        // check if page with data-url already exists in the dom ...
        Mexico.Mexican.prototype.initialize.call(this);
        var that = this;
        if (!this.equipment) {
          this.equipment = {};
        }
        // distribute equipment
        $('div[data-equipment]', $(this.el)).each(function() {
          var equipment = $(this).attr('data-equipment');
          that.equipment[equipment] = new Mexico.equipment[equipment];
          if (_.has(Mexico.equipment, equipment)) {
            $(this).replaceWith(that.equipment[equipment].el);
          }
        });

        if (this.options.persist) {
          $(this.el).attr('data-dom-cache', 'true');
        }

        // adjust header and footer to be persistent
        $('div[data-role="header"]', this.el).attr('data-id', 'machete-bandana');
        $('div[data-role="footer"]', this.el).attr('data-id', 'machete-boots');
      }
    },

    /**
     * Makes Machete appear.
     */
    appear: function(options) {
      var options = _.extend({
        transition: transition,
        reverse: reverse
      }, options);
      // transition stack handling
      var fragment = Backbone.history.fragment;
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
      $.mobile.changePage($(this.el), options);
    },

    eliminate: function() {
      // Clean up events bindings here ...
      _.each(this.equipment, function(equipment){
        equipment.eliminate();
      });
      // call super eliminate to clear bindings
      Mexico.Mexican.prototype.eliminate.call(this);
    }
  });

  // sets the scout to "machete", you will want to override this
  Mexico.scout = 'machete';
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

  // set up the pardre to enable scouting
  pardre = new Pardre();


  // Delay application start until all resources have been loaded
  $(window).load(function() {
    Backbone.history.start();
  });

  // Delete unused pages if they are not marked as dom-cached
  $(document).bind('pageshow', function(event, ui) {
    if ($(ui.prevPage).attr('data-dom-cache') !== 'true') {
      ui.prevPage.remove();
    }
  });

  // ======================================================================
  // MACHETE JQUERY DOM MANIPULATION OVERRIDES
  // ======================================================================
  // override jquery methods which delete elements to trigger proper cleanup
  // behavior
  _eliminateElement = function (elem) {
    if (_(elem[0]).isObject() && _(elem[0]).has('Mexican')) {
      elem[0].Mexican.eliminate();
    }
    $('.mexican', elem).each(function() {
      this.Mexican.eliminate();
    });
  };

  var macheteRemove = $.fn.remove;
  $.fn.remove = function (selector, keepData) {
    _eliminateElement(this);
    macheteRemove.call(this, selector, keepData);
  };

  var macheteEmpty = $.fn.remove;
  $.fn.remove = function () {
    _eliminateElement(this);
    macheteEmpty.call(this);
  };

  var macheteReplaceWith = $.fn.remove;
  $.fn.remove = function (value) {
    _eliminateElement(this);
    macheteReplaceWith.call(this, value);
  };
}(jQuery));
