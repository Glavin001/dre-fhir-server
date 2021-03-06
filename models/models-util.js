'use strict';

var util = require('util');

var _ = require('lodash');
var bbu = require('blue-button-util');

var bbudt = bbu.datetime;

var errUtil = require('../lib/error-util');
var bundleUtil = require('../lib/bundle-util');

exports.saveResourceAsSource = function (connection, ptKey, resource, callback) {
    var resourceAsText = JSON.stringify(resource, undefined, 4);
    var metaData = {
        type: 'application/json+fhir',
        name: 'fhir.patient',
        size: resourceAsText.length
    };
    connection.saveSource(ptKey, resourceAsText, metaData, 'fhir', function (err, sourceId) {
        if (err) {
            callback(errUtil.error('internalDbError', err.message));
        } else {
            callback(null, sourceId);
        }
    });
};

exports.findPatientKey = function (connection, resource, patientProperty, callback) {
    var p = resource[patientProperty];
    var reference = p && p.reference;
    if (!reference) {
        callback(errUtil.error('createPatientMissing', 'No patient specified'));
    } else {
        connection.idToPatientKey('demographics', reference, function (err, keyInfo) {
            if (err) {
                callback(errUtil.error('internalDbError', err.message));
            } else {
                if (keyInfo && !keyInfo.invalid) {
                    callback(null, keyInfo.key);
                } else {
                    var missingMsg = util.format('No patient resource with id %s', reference);
                    callback(errUtil.error('createPatientMissing', missingMsg));
                }
            }
        });
    }
};

var paramsToBBRParams = exports.paramsToBBRParams = (function () {
    var prefixMap = {
        '<': '$lt',
        '>': '$gt',
        '>=': '$gte',
        '<=': '$lte'
    };

    return function (params, map) {
        var keys = Object.keys(params);
        var queryObject = {};
        keys.forEach(function (key) {
            var target = map[key];
            if (target) {
                var paramsElement = params[key];
                var value = paramsElement.value;
                if (paramsElement.type === 'date') {
                    var modelDate = bbudt.dateToModel(value);
                    value = modelDate.date;
                }
                if (paramsElement.prefix) {
                    var op = prefixMap[paramsElement.prefix];
                    var valueWithAction = {};
                    valueWithAction[op] = value;
                    queryObject[target] = valueWithAction;
                } else {
                    queryObject[target] = value;
                }
            }
        });
        return queryObject;
    };
})();
