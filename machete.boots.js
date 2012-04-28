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
  Mexico.boots = new Boots();

  /**
   * Register boots in equipment rooster. Every equipment has to be a
   * Class extending Mexico.Equipment. Use <div data-equipment="[boots]"/>
   * to include it.
   */
  Mexico.equipment.boots = Mexico.Mexican.extend({
    mustache: '<div data-role="footer"><div data-role="navbar"><ul></ul></div></div>',
    collection: Mexico.boots,
    render: function() {
      var list = this.$('ul');
      this.collection.each(function(model) {
        list.append(new BootDisplay({model: model}).render().el);
      });
      return this;
    },
  });


  /**
   * Bootdisplay, rendering one boot and listening to active-changes.
   */
  BootDisplay = Mexico.Mexican.extend({
    mustache: '<li><a href="#{{route}}">{{text}}</a></li>',
    events: {
      'change:active @model': 'refreshActive'
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
    },
  });

  // Global instance of boots-collection

  $(document).bind('pagebeforeshow', function(event, ui) {
    // set boots to active fragment
    Mexico.boots.setActive(Backbone.history.fragment);
  });
}(jQuery));
