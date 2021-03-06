'use strict';

var util = require('util');
var bbFhir = require('blue-button-fhir');

var resource = require('./resource-with-patient');
var bundleUtil = require('../lib/bundle-util');
var errUtil = require('../lib/error-util');
var modelsUtil = require('./models-util');

var libraryVitals = resource({
    sectionName: 'vitals',
    patientRefKey: 'subject',
    searchSections: ['vitals', 'results']
});

var libraryResults = resource({
    sectionName: 'results',
    patientRefKey: 'subject',
    searchSections: ['vitals', 'results']
});

var findSection = function (bbr, id, invalidIsError, callback) {
    bbr.idToPatientKey('vitals', id, function (err, keyInfoVitals) {
        if (err) {
            callback(errUtil.error('internalDbError', err.message));
        } else if (!keyInfoVitals) {
            bbr.idToPatientKey('results', id, function (err, keyInfoResults) {
                if (err) {
                    callback(errUtil.error('internalDbError', err.message));
                } else if (!keyInfoResults) {
                    callback(null, null);
                } else {
                    callback(null, 'results');
                }
            });
        } else if (keyInfoVitals.invalid) {
            if (invalidIsError) {
                var invalidIdMsg = util.format('Resource id is invalid %s', id);
                callback(errUtil.error('updateInvalidId', invalidIdMsg));
            } else {
                callback(null, null);
            }
        } else {
            callback(null, 'vitals');
        }
    });
};

exports.createShared = function (bbr, resource, id, callback) {
    var sectionName = bbFhir.classifyResource(resource);
    if (sectionName === 'vitals') {
        libraryVitals.createShared(bbr, resource, id, callback);
    } else {
        libraryResults.createShared(bbr, resource, id, callback);
    }
};

exports.create = function (bbr, resource, callback) {
    this.createShared(bbr, resource, null, callback);
};

var paramToBBRParamMap = {
    '_id': '_id',
    'subject': 'pat_key'
};

exports.search = function (bbr, params, callback) {
    libraryVitals.search(bbr, params, callback);
};

exports.read = function (bbr, id, callback) {
    findSection(bbr, id, false, function (err, sectionName) {
        if (err) {
            callback(err);
        } else if (!sectionName) {
            var missingMsg = util.format('No resource with id %s', id);
            callback(errUtil.error('readMissing', missingMsg));
        } else {
            if (sectionName === 'vitals') {
                libraryVitals.read(bbr, id, callback);
            } else {
                libraryResults.read(bbr, id, callback);

            }
        }
    });
};

exports.update = function (bbr, resource, callback) {
    var self = this;
    findSection(bbr, resource.id, true, function (err, sectionName) {
        if (err) {
            callback(err);
        } else if (!sectionName) {
            self.createShared(bbr, resource, resource.id, function (err, createInfo) {
                if (!err) {
                    createInfo.isCreated = true;
                }
                callback(err, createInfo);
            });
        } else {
            if (sectionName === 'vitals') {
                libraryVitals.update(bbr, resource, callback);
            } else {
                libraryResults.update(bbr, resource, callback);
            }
        }
    });
};

exports.delete = function (bbr, id, callback) {
    findSection(bbr, id, false, function (err, sectionName) {
        if (err) {
            callback(err);
        } else {
            if (sectionName === 'vitals') {
                libraryVitals.delete(bbr, id, callback);
            } else {
                libraryResults.delete(bbr, id, callback);
            }
        }
    });
};
