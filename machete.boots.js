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

  /**
   * Register boots in equipment rooster. Every equipment has to be a
   * Class extending Mexico.Equipment. Use <div data-equipment="[boots]"/>
   * to include it.
   */
  Mexico.equipment.boots = Mexico.Mexicant.extend({
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

  // Global instance of boots-collection
  Mexico.boots = new Boots();

  $(document).bind('pageshow', function(event, ui) {
    // set boots to active fragment
    if (_.has(Mexico, 'boots')) {
      Mexico.boots.setActive(Backbone.history.fragment);
    }
  });
}(jQuery));
