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

  /**
   * Change color swatches dynamically.
   */
  $.fn.changeColorSwatch = function(theme, type) {
    if (!type) {
      type = 'theme';
    }
    var currentTheme = this.attr('data-' + type);
    if (!currentTheme) {
      currentTheme = 'c';
    }
    this.attr('data-' + type, theme);
    var regex = new RegExp('^ui-(.*)-' + currentTheme + '$');
    var classes = $.extend({}, this[0].classList);
    var i = classes.length;
    while (i--) {
      var match = classes[i].match(regex);
      if (match) {
        this.removeClass(match[0]);
        this.addClass('ui-' + match[1] + '-' + theme);
      }
    }
    if(this.attr('type') == 'button') {
      this.parent().changeColorSwatch(theme, type);
    }
    if (this.attr('type') == 'checkbox') {
      this.parent().find('label[for="' + this.attr('name') + '"]')
        .changeColorSwatch(theme, type);
    }
  };
  /**
   * Mexico shouts out in anger!
   * And delivers useful messages to your user.
   */
  Mexico.shout = function (message, callback, theme) {
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

  Mexico.loading = function () {
    $.mobile.showPageLoadingMsg('b', 'Loading ...');
    overruleMsgHide = true;
  }
  Mexico.loadingDone = function() {
    overruleMsgHide = false;
    $.mobile.hidePageLoadingMsg();
  }

  // Global store for transition/direction data caught from click events
  var transition = false;
  var reverse = false;

  /* Event Bindings - hashchange, submit, and click */
	function findClosestLink( ele ) {
		while ( ele ) {
			// Look for the closest element with a nodeName of "a".
			// Note that we are checking if we have a valid nodeName
			// before attempting to access it. This is because the
			// node we get called with could have originated from within
			// an embedded SVG document where some symbol instance elements
			// don't have nodeName defined on them, or strings are of type
			// SVGAnimatedString.
			if ( ( typeof ele.nodeName === "string" ) && ele.nodeName.toLowerCase() == "a" ) {
				break;
			}
			ele = ele.parentNode;
		}
		return ele;
	}
  /**
   * Handle all click events to provide jQuery mobile standard functionality.
   */
  $(document).bind('click', function (event) {
    if (transitioning) {
      event.preventDefault();
      return false;
    }
    var link = findClosestLink(event.target);
    var target = $(link);
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
      if (this.options.mustache) {
        this.mustache = this.options.mustache;
      }
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
      if ($(':jqmData(url="' + fragment + '")').length > 0) {
        this.setElement($('div:jqmData(url="' + fragment + '")'), false);
        this.delegated = true;
      }
      else {
        this._build();
      }
    },

    /**
     * Helper function to build content.
     */
    _build: function() {
      Mexico.Mexican.prototype._ensureElement.call(this);
      $.mobile.pageContainer.append(this.el);
      // get the current fragment
      var fragment = Backbone.history.fragment;
      var that = this;
      // distribute equipment
      $('div[data-equipment]', $(this.el)).each(function() {
        var equipment = $(this).attr('data-equipment');
        if (_.has(Mexico.equipment, equipment)) {
          $(this).replaceWith((new Mexico.equipment[equipment]).render().el);
        }
      });
      if (this.options.persist) {
        $(this.el).attr('data-dom-cache', 'true');
      }
      $(this.el).attr('data-url', fragment);

      // adjust header and footer to be persistent
      $('div[data-role="header"]', this.el).attr('data-id', 'machete-bandana');
      $('div[data-role="footer"]', this.el).attr('data-id', 'machete-boots');
    },


    /**
     * Makes Machete appear.
     */
    appear: function(options) {
      var options = _.extend({
        transition: transition,
        reverse: reverse,
        showLoadMsg: false
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
      var page = $(this.el);
      $.mobile.changePage(page, options);
    },
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
}(jQuery));
