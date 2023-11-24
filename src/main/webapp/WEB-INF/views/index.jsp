<!DOCTYPE html>
<%@page import="org.osmsurround.ae.filter.FilterManager;"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@ taglib prefix="wt" uri="http://www.grundid.de/webtools"%>
<%@ taglib prefix="spring" uri="http://www.springframework.org/tags"%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" buffer="128kb"%>
<html><head>
<title>Amenity Editor for OpenStreetMap</title>
<meta http-equiv="Content-Type" content="text/html;charset=UTF-8" />
<meta name="description" lang="en" content="Simple online editing tool for amenities/POIs in the OpenStreetMap.">
<meta name="keywords" lang="en" content="osm, openstreetmap, amenity, editor, poi, pois, form">
<meta name="description" lang="de" content="Einfaches Online Werkzeug um Amenity/POIs Knoten in OpenStreetMap zu bearbeiten.">
<meta name="keywords" lang="de" content="osm, openstreetmap, amenity, editor, poi, pois, formular">
<meta name="author" content="GrundID GmbH, www.grundid-gmbh.de">
<link rel="StyleSheet" media="screen" type="text/css" href="<wt:ue>/stylesheet.css</wt:ue>"/>
<link rel="icon" type="image/png" href="favicon.png" />
<script type="text/javascript" src="<wt:ue>/OpenLayers.js</wt:ue>"></script>
<script type="text/javascript" src="https://openstreetmap.org/openlayers/OpenStreetMap.js"></script>
<script type="text/javascript" src="<wt:ue>/js/prototype-1.6.1_rc2.js</wt:ue>"></script>
<script type="text/javascript" src="<wt:ue>/js/scriptaculous.js?load=effects,controls</wt:ue>"></script>
<script type="text/javascript" src="<wt:ue>/js/ae.js</wt:ue>"></script>
<script type="text/javascript">
var URL = {
	search: "<wt:ue>/ae/search</wt:ue>",
	amenity: "<wt:ue>/ae/amenity</wt:ue>",
	acKey: "<wt:ue>/ae/ac/key</wt:ue>",
	acValue: "<wt:ue>/ae/ac/value</wt:ue>",
	osmUpdate: "<wt:ue>/ae/osmUpdate</wt:ue>",
	templates: "<wt:ue>/ae/templates</wt:ue>"
};
var MSG = {
	buttonStopCreating: "<spring:message code='button.stop.creating'/>",
	buttonCreateNode: "<spring:message code='button.create.node'/>",
	templateInfo: "<spring:message code='template.info'/>",
	ebOsmButton: "<spring:message code='eb.osm.button'/>",
	ebOsmButtonTitle: "<spring:message code='eb.osm.button.label'/>",
	ebMoveButton: "<spring:message code='eb.move.button'/>",
	ebDeleteButton: "<spring:message code='eb.delete.button'/>",
	ebSaveButton: "<spring:message code='eb.save.button'/>",
	ebCloseButton: "<spring:message code='eb.close.button'/>"
};
var MIN_ZOOM_FOR_EDIT = 14, MAX_ZOOM = 18;
var map, layerMapnik = new OpenLayers.Layer.OSM.Mapnik("Mapnik");
var contextPath = '<wt:ue ignoreServletName="true"/>';
var oauthTokensAvailable = <c:if test="${startParameters.oauthTokenAvailable}">true</c:else>false</c:if>;
var keyValueTemplates = {}, wizardData = {};
var idCounter = 0;
var addNewNode = false, movingNode = false;
OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {
	defaultHandlerOptions: {
		single: true, stopSingle: false,
		double: false, stopDouble: false,
		pixelTolerance: 0
	},
	initialize: function(options) {
		this.handlerOptions = OpenLayers.Util.extend({}, this.defaultHandlerOptions);
		OpenLayers.Control.prototype.initialize.apply(this, arguments);
		this.handler = new OpenLayers.Handler.Click(this, {click: this.trigger}, this.handlerOptions);
	},
	trigger: function(e) {
		try {
			if (addNewNode) {
				AE.removeNewAmenityFeature();
				var lonlat = map.getLonLatFromViewPortPx(e.xy);
				var amenity = new Amenity(x2lon(lonlat.lon), y2lat(lonlat.lat));
				var feature = AE.createFeature(amenity);
				feature.popupClicked = true;
				AE.layerNew.addMarker(feature.marker);
				AE.newAmenityFeature = feature;
			}
			if (AE.isMoving()) {
				AE.removeNewAmenityFeature();
				var lonlat = map.getLonLatFromViewPortPx(e.xy);
				AE.movingAmenity.newLon = x2lon(lonlat.lon);
				AE.movingAmenity.newLat = y2lat(lonlat.lat);
				var feature = AE.createFeature(AE.movingAmenity, true);
				feature.popupClicked = true;
				AE.layerNew.addMarker(feature.marker);
				AE.newAmenityFeature = feature;
			}
		} catch (e) { alert(e) }
	}
});
function switchAdding() {
	addNewNode = !addNewNode;
	$('newNodeButton').value = addNewNode ? MSG.buttonStopCreating : MSG.buttonCreateNode;
	if (!addNewNode)
		AE.removeNewAmenityFeature();
}
function Amenity(lon, lat) {
	this.nodeId = 0;
	this.lon = lon, this.lat = lat;
	this.keyValues = new Object(), this.keyValues.amenity = ''
}
function plusfacteur(a) { return a * 20037508.34 / 180 }
function moinsfacteur(a) { return a * 180 / 20037508.34 }
function y2lat(a) { return Math.atan(Math.exp(moinsfacteur(a) / 180 * Math.PI)) / Math.PI * 360 - 90 }
function lat2y(a) { return plusfacteur(Math.log(Math.tan((a + 90) / 360 * Math.PI)) / Math.PI * 180) }
function x2lon(a) { return moinsfacteur(a) }
function lon2x(a) { return plusfacteur(a) }
function lonLatToMercator(ll) { return new OpenLayers.LonLat(lon2x(ll.lon), lat2y(ll.lat)) }
function init() {
	new Ajax.Request(URL.templates, {method: 'GET', onSuccess: function(result) {
		var data = result.responseJSON;
		keyValueTemplates = data.keyValueTemplates, wizardData = data.wizardData
	}});
	map = new OpenLayers.Map('map', {displayProjection: new OpenLayers.Projection('EPSG:4326'), units: 'm', numZoomLevels: MAX_ZOOM,
		maxExtent: new OpenLayers.Bounds(-20037508.34, -20037508.34, 20037508.34, 20037508.34),
		restrictedExtent: new OpenLayers.Bounds(-20037508.34, -20037508.34, 20037508.34, 20037508.34)});
	AE.init(map, contextPath);
	layerMapnik.attribution = null;
	map.addLayers([layerMapnik, AE.layerNew, AE.layerMarkers]);
	map.addControl(new OpenLayers.Control.LayerSwitcher());
	map.addControl(new OpenLayers.Control.ScaleLine());
	map.addControl(new OpenLayers.Control.Permalink());
	map.addControl(new OpenLayers.Control.MousePosition());
	var panel = new OpenLayers.Control.Panel();
	map.setCenter(lonLatToMercator(new OpenLayers.LonLat(${startParameters.geoLocation.longitude}, ${startParameters.geoLocation.latitude})), ${startParameters.zoom});
	map.events.register('moveend', map, updateAmenities);
	map.events.register('zoomend', map, updateZoomStatus);
	var click = new OpenLayers.Control.Click();
	map.addControl(click);
	click.activate();
	loadSettingsFromCookie();
	updateZoomStatus();
	updateAmenities(null);
}
function autoCompleteCallBack(inputField, queryString) {
	var prev = inputField.previousSiblings();
	var keyValue = '';
	for (var x = 0; x < prev.length; x++) {
		var elem = prev[x];
		if (elem.tagName == 'INPUT') {
			keyValue = elem.value;
			break;
		}
	}
	return queryString + '&key=' + keyValue;
}
var extWest = 0, extEast = 0, extNorth = 0, extSouth = 0;
function updateAmenities(event, url, forceUpdate) {
	if (AE.isMoving())
		return;
	url = url || URL.search;
	var coords = map.getCenter();
	var lon = x2lon(coords.lon), lat = y2lat(coords.lat);
	var zoom = map.getZoom();
	if (zoom > MIN_ZOOM_FOR_EDIT) {
		var bounds = map.getExtent().toArray();
		var west = x2lon(bounds[0]), south = y2lat(bounds[1]), east = x2lon(bounds[2]), north = y2lat(bounds[3]);
		if (forceUpdate
		|| extWest > west || extEast < east || extSouth > south || extNorth < north
		|| url != URL.search) {
			var params = $('filterform').serialize(true);
			params.west = west = extWest = Math.floor(west * 100) / 100 - 0.015;
			params.south = south = extSouth = Math.floor(south * 100) / 100 - 0.015;
			params.east = east = extEast = Math.ceil(east * 100) / 100 + 0.015;
			params.north = north = extNorth = Math.ceil(north * 100) / 100 + 0.015;
			delete params.saveincookie;
			$('loading').show();
			new Ajax.Request(url, {method: 'GET', parameters: params, onSuccess: function(transport) {
				var jsonData = transport.responseJSON;
				if (jsonData.message)
					$('loading').hide(), alert(jsonData.message);
				else
					AE.refreshAmenities(jsonData);
			}});
		}
	}
}
function createKeyValueTable(amenity) {
	var nodeId = amenity.nodeId;
	var formTag = new Element('form', {id: 'form_' + nodeId, method: 'POST', action: URL.amenity});
	formTag.insert(new Element('input', {type: 'hidden', name: '_nodeId', value: nodeId}));
	formTag.insert(new Element('input', {type: 'hidden', name: 'lon', value: amenity.lon}));
	formTag.insert(new Element('input', {type: 'hidden', name: 'lat', value: amenity.lat}));
	if (amenity.newLon && amenity.newLat) {
		formTag.insert(new Element('input', {type: 'hidden', name: 'newlon', value: amenity.newLon}));
		formTag.insert(new Element("input", {type: 'hidden', name: 'newlat', value: amenity.newLat}));
	}
	formTag.insert(new Element('input', {type: 'hidden', name: '_method', value: nodeId > 0 ? 'PUT' : 'POST'}));
	for (var key in amenity.keyValues) {
		idCounter++;
		formTag.insert(createTagValue(nodeId, key, amenity.keyValues[key]));
	}
	return formTag;
}
function updateKeyValueTable(nodeId) {
	var params = new Object();
	params.nodeId = nodeId;
	new Ajax.Request(URL.amenity, {
			method: 'GET',
			parameters: params,
			onSuccess: function(transport) {
				createEditBox($('amenity_' + transport.responseJSON.nodeId), transport.responseJSON);
				alert('OK');
			}
		});
}
function createLinkIcon(iconName, url, title) {
	var elem = new Element('a', {href: url, target: '_blank', class: "ae-url-icon"});
	elem.insert(new Element('img', {src: contextPath + '/img/icons/' + iconName, title: title}));
	return elem;
}
function createTagValue(nodeId, key, value) {
	idCounter++;
	var keyId = 'k_' + idCounter + '_' + nodeId;
	var valueId = 'v_' + idCounter + '_' + nodeId;
	var keyIdChoices = keyId + '_choices';
	var newDiv = new Element('div');
	newDiv.insert(new Element('input', {id: keyId, type: "text", name: 'key', class: 'inputkey', size: 24, value: key}));
	newDiv.insert(new Element('div', {id: keyIdChoices, class: 'autocomplete'}));
	newDiv.insert(new Element('script').update('new Ajax.Autocompleter("' + keyId + '","' + keyId + '_choices","' + URL.acKey + '",{method:'GET',paramName:'input',minChars:1,frequency:.5})'));
	newDiv.insert(new Element('span').update('&nbsp;'));
	var valueInput = new Element('input', {id: valueId, type: 'text', name: 'value', class: 'inputvalue', size: 32, value: value});
	newDiv.insert(valueInput);
	if (key == 'url' && value != '')
		newDiv.insert(createLinkIcon('world.png', value, 'Show URL'));
	if (key == 'amenity'
	|| key == 'shop')
		newDiv.insert(createLinkIcon('anchor.png', 'https://wiki.openstreetmap.org/wiki/Tag:' + key + '=' + value, 'Show Wiki'));
	newDiv.insert(new Element('div', {id: valueId + '_choices', class: 'autocomplete'}));
	newDiv.insert(new Element('script').update('new Ajax.Autocompleter("' + valueId + '","' + valueId + '_choices","' + URL.acValue + '",{method:'GET',paramName:'input',minChars:1,frequency:.5,callback:autoCompleteCallBack})'));
	return newDiv;
}
function addTag(nodeId) {
	$('form_' + nodeId).insert(createTagValue(nodeId, '', ''));
	$('k_' + idCounter + '_' + nodeId).focus();
}
function addTags(nodeId, tags) {
	if (tags[''] == '') // adding an empty key value pair?
		addTag(nodeId);
	else {
		var firstKey = null;
		var amenity = AE.getAmenity(nodeId);
		for (var key in tags) {
			if (amenity && amenity.keyValues[key] == null) {
				if (firstKey == null)
					firstKey = 'v_' + idCounter + '_' + nodeId;
				$('form_' + nodeId).insert(createTagValue(nodeId, key, tags[key]));
				amenity.keyValues[key] = tags[key];
			}
		}
		if (firstKey)
			$(firstKey).focus();
	}
}
function createAddTagIcon(nodeId, iconUrl, iconTitle, tags) {
	var newA = new Element('a', {class: 'ae-add-tag-icon', href: '#', onclick: 'addTags("' + nodeId + '",' + Object.toJSON(tags) + ')'});
	newA.insert(new Element('img', {title: iconTitle, src: iconUrl}));
	return newA;
}
function createNewAmenityWizard(amenity) {
	var newDiv = new Element('div');
	newDiv.insert(new Element('div', {class: 'ae-simple-text'}).update(MSG.templateInfo));
	var nodeId = amenity.nodeId;
	for (var key in wizardData)
		newDiv.insert(new Element('a', {class: 'ae-create-amenity', href: '#', onclick: 'addDefaultTags("' + nodeId + '",' + Object.toJSON(wizardData[key]) + ')'}).update(key));
	return newDiv;
}
function addDefaultTags(nodeId, tags) {
	var amenity = AE.getAmenity(nodeId);
	amenity.keyValues = new Object();
	Object.extend(amenity.keyValues, tags);
	$('keyvaluetab_' + nodeId).update(createKeyValueTable(amenity));
	$('naw_' + nodeId).hide();
	$('keyvaluetab_' + nodeId).show();
	$('form_' + nodeId).focusFirstElement();
}
function createTitleDiv(amenity) {
	var newDiv = new Element('div', {class: 'ae-nodedetails'});
	if (amenity.nodeId != 0)
		newDiv.insert(new Element('a', {target: '_blank', href: 'https://www.openstreetmap.org/browse/node/' + amenity.nodeId}).update('Id: ' + amenity.nodeId));
	else
		newDiv.insert('New Node');
	newDiv.insert(' lon: ' + amenity.lon + ' lat: ' + amenity.lat);
	return newDiv;
}
function createEditBox(newDiv, amenity, feature) {
	newDiv.update(new Element('div', {class: 'ae-nodename'}).update('Node name: ' + amenity.name));
	newDiv.insert(createTitleDiv(amenity));

	var keyValueTab = new Element('div', {id: 'keyvaluetab_' + amenity.nodeId, class: 'ae-keyvaluetab'}).update(createKeyValueTable(amenity));
	if (amenity.nodeId == 0) {
		keyValueTab.hide();
		editArea.insert(new Element('div', {id: 'naw_' + amenity.nodeId, class: 'ae-keyvaluetab'}).update(createNewAmenityWizard(amenity)));
	}
	var editArea = new Element('div', {class: 'ae-editarea'});
	editArea.insert(keyValueTab);
	newDiv.insert(editArea);

	var buttonDiv = new Element('div', {class: 'ae-buttons-top'});
	for (var x = 0; x < keyValueTemplates.length; x++) {
		var template = keyValueTemplates[x];
		buttonDiv.insert(createAddTagIcon(amenity.nodeId, contextPath + template.iconUrl, template.iconTitle, template.tags));
	}
	newDiv.insert(buttonDiv);

	buttonDiv = new Element('div', {class: 'ae-buttons'});
	var button = new Element('input', {type: 'button', class: 'ae-edit-button', value: MSG.ebOsmButton, title: MSG.ebOsmButtonTitle, onclick: 'updateKeyValueTable(' + amenity.nodeId + ')'});
	if (amenity.nodeId == 0 || AE.isMoving())
		button.setAttribute('disabled', 'disabled');
	buttonDiv.insert(button);

	button = new Element('input', {type: 'button', class: 'ae-edit-button', value: MSG.ebMoveButton, onclick: 'moveAmenity(' + amenity.nodeId + ')'});
	if (amenity.nodeId == 0 || AE.isMoving())
		button.setAttribute('disabled', 'disabled');
	buttonDiv.insert(button);

	var button = new Element('input', {type: 'button', class: 'ae-edit-button', value: MSG.ebDeleteButton, onclick: 'deleteAmenity(' + amenity.nodeId + ')'});
	if (amenity.nodeId == 0 || AE.isMoving())
		button.setAttribute('disabled', 'disabled');
	buttonDiv.insert(button);

	buttonDiv.insert(new Element('input', {type: 'button', class: 'ae-edit-button', value: MSG.ebSaveButton, onclick: 'saveAmenity(' + amenity.nodeId + ')'}));

	button = new Element('input', {type: 'button', class: 'ae-edit-button', value: MSG.ebCloseButton});
	button.observe('click', AE.closePopupHandler.bindAsEventListener(amenity));
	buttonDiv.insert(button);

	button = new Element('div', {class: 'ae-closeicon'});
	button.update(new Element('a', {href: '#'}));
	button.observe('click', AE.closePopupHandler.bindAsEventListener(amenity));
	buttonDiv.insert(button);

	newDiv.insert(buttonDiv);
}
function checkboxesChanged(cbs) {
	for (var x = 0; x < cbs.length; x++) {
		if (cbs[x].defaultChecked != cbs[x].checked)
			return true;
	return false;
}
function saveFilterSettings() {
	$('filter').hide();
	var f = $('filterform');
	if (f.lon.value)
		f.lon.value = f.lon.value.replace(/,/, '.');
	if (f.lat.value)
		f.lat.value = f.lat.value.replace(/,/, '.');
	if (checkboxesChanged(f.getInputs("checkbox", "show")) || checkboxesChanged(f.getInputs("checkbox", "hide")))
		updateAmenities(null, null, true);
	if (f.saveincookie.checked) {
		var cookie = new Date(); cookie.setTime(date.getTime() + (1000 * 60 * 60 * 24 * 28)); // 28 days
		cookie = 'expires=' + cookie.toGMTString() + ';settings=' + escape(Object.toJSON(f.serialize(true)));
		try {
			document.cookie = cookie
		} catch (e) {
			alert(e)
		}
	}
}
function loadSettingsFromCookie() {
	var cookie = document.cookie.match('settings=(.*?)(;|$)');
	if (cookie) {
		cookie = (unescape(cookie[1])).evalJSON();
		var f = $('filterform');
		f.saveincookie.checked = cookie.saveincookie && cookie.saveincookie == 1;
		f.lon.value = cookie.lon ? cookie.lon : '';
		f.lat.value = cookie.lat ? cookie.lat : '';
		var d = cookie.show, c = f.getInputs('checkbox', 'show');
		for (var i = c.length; --i >=0;)
			c[i].checked = c[i].value == d || d instanceof Array && d.indexOf(c[i].value) != -1;
		d = cookie.hide, c = f.getInputs('checkbox', 'hide');
		for (var i = c.length; --i >=0;)
			c[i].checked = c[i].value == d || d instanceof Array && d.indexOf(c[i].value) != -1;
<c:if test="${!startParameters.permalink}">
		if (cookie.lon && cookie.lat)
			map.setCenter(lonLatToMercator(new OpenLayers.LonLat(cookie.lon, cookie.lat)), MIN_ZOOM_FOR_EDIT + 1);
</c:if>
	}
}
function goToHomeBase() {
	var f = $('filterform');
	if (f.lon.value && f.lat.value)
		map.setCenter(lonLatToMercator(new OpenLayers.LonLat(f.lon.value, f.lat.value)), MIN_ZOOM_FOR_EDIT + 1);
	else
		alert("<spring:message code='alert.no.base'/>");
}
function showFilterSettings() {
	var c = $('filterform').getInputs('checkbox');
	for (var i = c.length; --i >=0;)
		c[i].defaultChecked = c[i].checked;
	$('filter').toggle();
}
function moveAmenity(nodeId) {
	$('moving').show();
	document.body.style.cursor = 'crosshair';
	AE.movingAmenity = AE.getAmenity(nodeId);
	AE.removeFeature(nodeId);
}
function cancelMoving() {
	$('moving').hide();
	document.body.style.cursor = 'auto';
	AE.movingAmenity.newLon = null;
	AE.movingAmenity.newLat = null;
	AE.addFeature(AE.createFeature(AE.movingAmenity));
	AE.movingAmenity = null;
	AE.removeNewAmenityFeature();
}
function checkAccessRights() {
	if (oauthTokensAvailable)
		return true;
	alert("<spring:message code='alert.acceptlicense'/>");
}
function saveAmenity(nodeId) {
	var f = $('form_' + nodeId);
	if (checkAccessRights()) {
		var params = new Object();
		params = Object.extend(params, f.serialize(true));
		if ((params._nodeId == 0 || AE.isMoving()) && (params.key.indexOf('highway') != -1 || params.key.indexOf("railway") != -1)) {
			alert("<spring:message code='no.highway.edit'/>");
			return;
		}
		$('storing').show();
		new Ajax.Request(URL.amenity, {method: params._nodeId != 0 ? 'PUT' : 'POST', parameters: params, onSuccess: function(transport) {
			AE.closePopup(nodeId);
			updateAmenities(null, null, true);
			$('storing').hide();
			$('moving').hide();
			document.body.style.cursor = 'auto';
			AE.removeNewAmenityFeature();
			AE.movingAmenity = null;
			alert(transport.responseJSON.message + "\n\n<spring:message code='save.action.info'/>");
		}});
	}
}
function deleteAmenity(nodeId) {
	if (confirm("<spring:message code='confirm.delete'/>")) {
		if (checkAccessRights()) {
			var params = new Object();
			params = Object.extend(params, $('form_' + nodeId).serialize(true));
			new Ajax.Request(URL.amenity, {method: 'DELETE', parameters: params, onSuccess: function(transport) {
				AE.closePopup(nodeId);
				updateAmenities(null, null, true);
				alert(transport.responseJSON.message);
			}});
		}
	}
}
function updateZoomStatus() {
	if (map.getZoom() <= MIN_ZOOM_FOR_EDIT)
		$('zoomStatus').show(), $('newNodeButton').disable(), $('loadOsmDataButton').disable();
	else
		$('zoomStatus').hide(), $('newNodeButton').enable(), $('loadOsmDataButton').enable();
}
function loadBbox() {
	updateAmenities(null, URL.osmUpdate, true);
}
function setMapCenterAsHomeBase() {
	var coords = map.getCenter();
	$('filterform').lon.value = x2lon(coords.lon);
	$('filterform').lat.value = y2lat(coords.lat);
}
function setMaxZoom() {
	map.zoomTo(MAX_ZOOM);
}
function selectAll() {
	$A(new Selector('.filter-positive-cb').findElements($('filterform'))).each(function(element) { element.checked = true });
}
function deselectAll() {
	$A(new Selector('.filter-positive-cb').findElements($('filterform'))).each(function(element) { element.checked = false });
}
function invertSelection() {
	$A(new Selector('.filter-positive-cb').findElements($('filterform'))).each(function(element) { element.checked = !element.checked });
}
window.onload = init;
</script>
</head>
<body>
<div id="content" style="height:100%;overflow:hidden">
	<div style="position:absolute;top:0;left:80px;right:60px;z-index:750;background-color:#FFF;background-repeat:repeat-x;border:1px solid #000;border-top:none;-moz-border-radius:0 0 6px 6px;border-radius:0 0 6px 6px;padding:5px;height:32px">
		<div style="font-size:14px;font-weight:bold">OSM Amenity Editor (${startParameters.version})</div>
		<div style="position:relative;font-size:9px;bottom:-5px;left:0;font-weight:normal">Made by <a href="http://www.grundid-gmbh.de">GrundID GmbH</a>, data by <a href="https://www.openstreetmap.org">OpenStreetMap</a> under <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, with <a href="https://code.google.com/p/google-maps-icons/">Maps icons collection (CC BY SA 3.0)</a>. Contact: as(a t)osmsurround(d o t)org, a href="https://www.openstreetmap.org/user/nitegate">OSM User: nitegate</a>. Source Code: <a href="https://github.com/grundid/amenity-editor">@GitHub</a></div>
		<div style="position:absolute;top:5px;right:5px;width:780px;text-align:right"><c:if test="${startParameters.oauthTokenAvailable}"><span style="background-color:#ffe7cd;font-size:14px;padding:2px">OAuth OK!</span></c:if>
			<input type="button" class="ae-small-button" value="<spring:message code='button.max.zoom'/>" title="<spring:message code='button.max.zoom.hint'/>" onclick="setMaxZoom()"/>
			<input type="button" class="ae-small-button" value="<spring:message code='button.home.base'/>" title="<spring:message code='button.home.base.hint'/>" onclick="goToHomeBase()"/>
			<input type="button" class="ae-small-button" value="<spring:message code='button.create.node'/>" style="width:150px" id="newNodeButton" title="<spring:message code='button.create.node.hint'/>" onclick="switchAdding()"/>
			<input type="button" class="ae-small-button" value="<spring:message code='button.rod'/>" id="loadOsmDataButton" title="<spring:message code='button.rod.hint'/>" onclick="loadBbox()"/>
			<input type="button" class="ae-small-button" value="<spring:message code='button.settings'/>" title="<spring:message code='button.settings.hint'/>" onclick="showFilterSettings()">
			<input type="button" class="ae-small-button" value="<spring:message code='button.help'/>" title="<spring:message code='button.help.hint'/>" onclick="$('help').toggle()">
			<input type="button" class="ae-small-button" value="<spring:message code='button.oauth'/>" title="<spring:message code='button.oauth.hint'/>" onclick="window.location.href='<wt:ue>/ae/oauthRequest</wt:ue>'"/>
		</div>
	</div>
	<div style="position:absolute;top:55px;left 80px;right:60px;z-index:1000">
		<div style="text-align:center">
			<div class="infobox" style="width:800px;display:none;text-align: left" id="filter">
				<form id="filterform">
					<fieldset style="width:520px;float:left">
						<legend><spring:message code='settings.show'/></legend>
<c:forEach var="filter" items="<%= FilterManager.getInstance().getFiltersPositive() %>">
						<div style="float:left;width:170px"><input id="cb_${filter.name}" type="checkbox" class="filter-positive-cb" name="show" value="${filter.name}"<c:if test="${filter.defaultSelected}"> checked="checked"</c:if>/>&nbsp;<label for="cb_${filter.name}"><spring:message code='filter.${filter.name}'/>&nbsp;<img width="12" height="12" src="<wt:ue>/img/${filter.icon}</wt:ue>"></label></div>
</c:forEach>
						<div style="clear:both"><input type="button" class="ae-small-button" value="<spring:message code='button.select.all'/>" onclick="selectAll()"/> <input type="button" class="ae-small-button" value="<spring:message code='button.deselect.all'/>" onclick="deselectAll()"/> <input type="button" class="ae-small-button" value="<spring:message code='button.invert.selection'/>" onclick="invertSelection()"/></div>
					</fieldset>
					<fieldset style="width:240px">
						<legend><spring:message code='settings.hide'/></legend>
<c:forEach var="filter" items="<%= FilterManager.getInstance().getFiltersNegative() %>">
						<div><input id="cb_${filter.name}" type="checkbox" name="hide" value="${filter.name}"/>&nbsp;<label for="cb_${filter.name}"><spring:message code='filter.${filter.name}'/></label></div>
</c:forEach>
					</fieldset>
					<fieldset style="clear:both">
						<legend><spring:message code='settings.userpass'/></legend>
						<div><spring:message code='settings.noaccount'/></div>
					</fieldset>
					<fieldset>
						<legend><spring:message code='settings.base'/></legend>
						<div style="position:relative;height:22px"><span style="vertical-align:middle"><spring:message code='settings.lon'/>:&nbsp;</span><input type="text" name="lon" size="12" style="width:100px"> <span style="vertical-align:middle"><spring:message code='settings.lat'/>:&nbsp;</span><input type="text" name="lat" size="12" style="width:100px"></div>
						<div><input type="button" class="ae-small-button" value="<spring:message code='settings.button.center'/>" onclick="setMapCenterAsHomeBase()"></div>
					</fieldset>
					<fieldset>
						<legend><spring:message code='settings.cookies'/></legend>
						<input id="cb_saveincookie" type="checkbox" name="saveincookie" value="1"/>&nbsp;<label for="cb_saveincookie"><spring:message code='settings.saveincookie'/></label>
					</fieldset>
				</form>
				<p><input type="button" class="ae-small-button" value="<spring:message code='settings.button.apply'/>" onclick="saveFilterSettings()"> <input type="button" class="ae-small-button" value="<spring:message code='settings.button.close'/>" onclick="$('filter').hide()">/p>
			</div>
<%@ include file="includes/infobox.jspf" %>
			<div class="infobox" style="display:none;width:250px" id="feamenities"><spring:message code='info.fewamenities'/></div>
			<div class="infobox" style="display:none;width:350px" id="moving"><spring:message code='move.info'/><br/><input type="button" class="ae-small-button" value="<spring:message code='move.button'/>" title="<spring:message code='move.button.hint'/>" onclick="cancelMoving()"></div>
			<div class="infobox" style="width:170px;display:none" id="loading"><spring:message code='status.loading.data'/><br/><img src="<wt:ue>/img/throbber.gif</wt:ue>"></div>
			<div class="infobox" style="display:none;width:170px" id="storing"><spring:message code='status.saving.data'/><br/><img src="<wt:ue>/img/throbber.gif</wt:ue>"></div>
			<div class="infobox" style="display:none;width:400px" id="zoomStatus"><spring:message code='status.zoom.to.small'/><br/><input type="button" class="ae-small-button" value="<spring:message code='button.adujst.zoom'/>" title="<spring:message code='button.adujst.zoom.hint'/>" onclick="map.zoomTo(MIN_ZOOM_FOR_EDIT + 1)"></div>
		</div>
	</div>
	<div id="map" style="height:100%"></div>
</div>
<noscript><spring:message code='no.javascript'/></noscript>
</body>
</html>
