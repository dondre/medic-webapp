var SETTING_NAME = 'contact_summary';

/**
 * Service for generating summary information based on a given
 * contact and reports about them.
 * Documentation: https://github.com/medic/medic-docs/blob/master/configuration/contact-summary.md
 */
angular.module('inboxServices').service('ContactSummary',
  function(
    $filter,
    $log,
    Settings
  ) {

    'use strict';
    'ngInject';

    var generatorFunction;

    var getGeneratorFunction = function() {
      if (!generatorFunction) {
        generatorFunction = Settings()
          .then(function(settings) {
            return settings[SETTING_NAME];
          })
          .then(function(script) {
            if (!script) {
              return function() {};
            }
            return new Function('contact', 'reports', 'lineage', script); // jshint ignore:line
          });
      }
      return generatorFunction;
    };

    var applyFilter = function(field) {
      if (field.filter) {
        try {
          field.value = $filter(field.filter)(field.value);
        } catch(e) {
          throw new Error('Unknown filter: ' + field.filter + '. Check your configuration.', e);
        }
      }
    };

    var applyFilters = function(summary) {
      $log.debug('contact summary eval result', summary);
      
      summary = summary || {};
      summary.fields = summary.fields || [];
      summary.cards = summary.cards || [];

      summary.fields.forEach(applyFilter);
      summary.cards.forEach(function(card) {
        card.fields.forEach(applyFilter);
      });
      return summary;
    };

    return function(contact, reports, lineage) {
      return getGeneratorFunction()
        .then(function(fn) {
          return fn(contact, reports || [], lineage || []);
        })
        .then(applyFilters);
    };
  }
);
