'use strict';

var util = require('util');
var _ = require('lodash');

var samples = require('../samples/allergyIntolerance-samples');
var patientSamples = require('../samples/patient-samples')();
var supertestWrap = require('./supertest-wrap');
var appWrap = require('./app-wrap');
var common = require('./common');

var fn = common.generateTestItem;

describe('routes allergyIntolerance', function () {
    var appw = appWrap.instance('fhirallergyintoleranceapi');
    var r = supertestWrap({
        appWrap: appw,
        resourceType: 'AllergyIntolerance',
        readTransform: function (resource) {
            delete resource.patient.display;
        }
    });
    var pt = supertestWrap({
        appWrap: appw,
        resourceType: 'Patient'
    });

    var resourceSets = [samples.set0(), samples.set1()];

    before(fn(appw, appw.start));

    it('check config (inits database as well)', fn(r, r.config));

    it('clear database', fn(appw, appw.cleardb));

    it('fail to create resource 0 for patient 0 with patient ref missing', fn(r, r.createNegative, resourceSets[0][0]));

    _.range(2).forEach(function (index) {
        var title = util.format('create patient %s', index);
        it(title, fn(pt, pt.create, [patientSamples[index]]));
    }, this);

    it('assign patient refs to all resources', function () {
        common.putPatientRefs(resourceSets, patientSamples, 'patient');
    });

    _.range(2).forEach(function (i) {
        _.range(resourceSets[i].length).forEach(function (j) {
            var title = util.format('create resource %s for patient %s', j, i);
            it(title, fn(r, r.create, resourceSets[i][j]));
        }, this);
    }, this);

    var n = resourceSets[0].length + resourceSets[1].length;
    it('search all using get', fn(r, r.search, [n, {}]));
    it('search all using post', fn(r, r.searchByPost, [n, {}]));

    _.range(2).forEach(function (i) {
        _.range(resourceSets[i].length).forEach(function (j) {
            var title = util.format('read resource %s for patient %s', j, i);
            it(title, fn(r, r.read, resourceSets[i][j]));
        }, this);
    }, this);

    it('update local resource 0 for patient 0', function () {
        resourceSets[0][0].recordedDate = '2002-01-01';
    });

    it('update local resource 0 for patient 1', function () {
        resourceSets[1][0].recordedDate = '2003-05-05';
    });

    _.range(2).forEach(function (i) {
        var ptTitle = util.format(' for patient %s', i);
        it('detect resource 0 not on server' + ptTitle, fn(r, r.readNegative, resourceSets[i][0]));
        it('update resource 0' + ptTitle, fn(r, r.update, resourceSets[i][0]));
        it('read resource 0' + ptTitle, fn(r, r.read, resourceSets[i][0]));
    }, this);

    var n0 = resourceSets[0].length - 1;
    var n1 = resourceSets[1].length - 1;

    it('delete last resource for patient 0', fn(r, r.delete, resourceSets[0][n0]));
    it('delete last resource for patient 1', fn(r, r.delete, resourceSets[1][n1]));

    it('search all using get', fn(r, r.search, [n0 + n1, {}]));

    after(fn(appw, appw.cleanUp));
});
