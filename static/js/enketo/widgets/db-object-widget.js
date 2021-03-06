if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';
    var _ = require('underscore');
    var Widget = require('enketo-core/src/js/Widget');
    var $ = require('jquery');

    require('enketo-core/src/js/plugins');

    var pluginName = 'dbobjectwidget';

    /**
     * Allows drop-down selectors for db objects.
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Dbobjectwidget( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Dbobjectwidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Dbobjectwidget.prototype.constructor = Dbobjectwidget;

    Dbobjectwidget.prototype._init = function() {
        construct( this.element );
    };

    function construct( element ) {
        // timeout needed to let setting the value complete before rendering
        setTimeout(function() {
            var $question = $( element );

            var angularServices = angular.element(document.body).injector();
            var Select2Search = angularServices.get('Select2Search');

            var $textInput = $question.find('input');

            var value = $textInput.val();
            var disabled = $textInput.prop('readonly');
            $textInput.replaceWith($textInput[0].outerHTML.replace(/^<input /, '<select ').replace(/<\/input>/, '</select>'));
            $textInput = $question.find('select');
            var preSelectedOption = $('<option></option>')
                      .attr('value', value)
                      .text(value);
            $textInput.append(preSelectedOption);

            var dbObjectType = $textInput.attr('data-type-xml');

            if (!$question.hasClass('or-appearance-bind-id-only')) {
                $textInput.on('change.dbobjectwidget', changeHandler);
            }
            Select2Search($textInput, dbObjectType, {
                allowNew: $question.hasClass('or-appearance-allow-new')
            }).then(function() {
                // select2 doesn't understand readonly
                $textInput.prop('disabled', disabled);
            });
        });
    }

    var changeHandler = function() {
        var $this = $(this);
        var selected = $this.select2('data');
        var doc = selected && selected[0] && selected[0].doc;
        if (doc) {
            // find the nearest repeat section, or form if not in a repeat
            var parent = $this.closest('.or-repeat,form.or');
            var field = $this.attr('name');
            var objectRoot = field.substring(0, field.lastIndexOf('/'));
            updateFields(parent, doc, objectRoot, field);
        }
    };

    var updateFields = function(parent, doc, objectRoot, keyPath) {
        Object.keys(doc).forEach(function(key) {
            var path = objectRoot + '/' + key;
            if (path === keyPath) {
                // don't update the field that fired the update
                return;
            }
            var value = doc[key];
            if (_.isArray(value)) {
                // arrays aren't currently handled
                return;
            }
            if (_.isObject(value)) {
                // recursively set fields for children
                return updateFields(parent, value, path, keyPath);
            }
            parent.find('[name="' + path + '"]')
                .val(value)
                .trigger('change');
        });
    };

    /**
     * This function, implemented on all enketo widgets, is only called when
     * cloning repeated sections of a form.  It's actually called on the cloned
     * copy of a question, and for some reason for this widget needs to destroy
     * and then re-create the select2.
     * @see https://github.com/medic/medic-webapp/issues/3487
     */
    Dbobjectwidget.prototype.destroy = function( element ) {
        deconstruct( element );
        construct( element );
    };

    /** Reverse the select2 setup steps performed in construct() */
    function deconstruct( element ) {
        var $question = $( element );

        $question.find( '.select2-container' ).remove();

        var $selectInput = $question.find( 'select' );

        // At this stage in construct(), the select2 jquery plugin is
        // initialised.  To reverse this, we would call:
        //     $selectInput.data( 'select2' ).destroy();
        // However, calling this here would destroy the select2 for the original
        // widget, so -do not do it-.

        $selectInput.off( 'change.dbobjectwidget' );

        $selectInput.find( 'option' ).remove();

        var replacementHtml = $selectInput[0].outerHTML
                .replace( /^<select /, '<input ' )
                .replace( /<\/select>/, '</input>' );
        $selectInput.replaceWith( replacementHtml );
    }

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Dbobjectwidget( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': '.or-appearance-db-object',
    };
} );
