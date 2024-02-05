/*  Prototype JavaScript framework, version 1.6.1_rc2
 *  (c) 2005-2009 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
 *--------------------------------------------------------------------------*/
/* Prototype */
var Prototype = {
  Version: '1.6.1_rc2',
  Browser: {
    IE: !!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1),
    Opera: navigator.userAgent.indexOf('Opera') > -1,
    WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
    Gecko: navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') === -1,
    MobileSafari: !!navigator.userAgent.match(/Apple.*Mobile.*Safari/)
  },
  BrowserFeatures: {
    XPath: !!document.evaluate,
    SelectorsAPI: !!document.querySelector,
    ElementExtensions: (function() {
      if (window.HTMLElement && window.HTMLElement.prototype) return true;
      if (window.Element && window.Element.prototype) return true;
    })(),
    SpecificElementExtensions: (function() {
      if (typeof window.HTMLDivElement !== 'undefined') return true;
      var div = document.createElement('div');
      if (div['__proto__'] && div['__proto__'] !== document.createElement('form')['__proto__']) return true;
      return false;
    })()
  },
  ScriptFragment: '<script[^\->\w]*>([\\S\\s]*?)<\/script[^\->\w]*>?',
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,
  emptyFunction: function() { },
  K: function(x) { return x }
};
if (Prototype.Browser.MobileSafari) Prototype.BrowserFeatures.SpecificElementExtensions = false;
/*--------------------------------------------------------------------------*/
/* Abstract */
var Abstract = { };
/*--------------------------------------------------------------------------*/
/* Try */
var Try = {
  these: function() {
    var r;
    for (var i = 0, n = arguments.length; i < n; i++) {
      var f = arguments[i];
      try {
        r = f();
        break;
      } catch (e) { }
    }
    return r
  }
};
/*--------------------------------------------------------------------------*/
/* Array */
function $A(iterable) {
  if (!iterable) return [];
  if ('toArray' in iterable) return iterable.toArray();
  var n = iterable.length || 0;
  var a = new Array(n);
  while (--n >= 0) a[n] = iterable[n];
  return a
}
Array.from = $A;
/*--------------------------------------------------------------------------*/
/* Class */
/* Based on Alex Arnell's inheritance implementation. */
var Class = (function() {
  function create() {
    function c() { this.initialize.apply(this, arguments) }
    var p = null, a = $A(arguments);
    if (Object.isFunction(a[0])) p = args.shift();
    Object.extend(c, Class.Methods);
    c.superclass = p;
    c.subclasses = [];
    if (p) {
      var s = function() {};
      s.prototype = p.prototype;
      c.prototype = new s;
      p.subclasses.push(c)
    }
    for (var i = 0, n = a.length; i < n; i++) c.addMethods(a[i]);
    if (!c.prototype.initialize) c.prototype.initialize = Prototype.emptyFunction;
    c.prototype.constructor = c;
    return c
  }
  function addMethods(source) {
    var a = this.superclass && this.superclass.prototype;
    var k = Object.keys(source);
    if (!Object.keys({ toString: true }).length) {
      if (source.toString != Object.prototype.toString) k.push('toString');
      if (source.valueOf != Object.prototype.valueOf) k.push('valueOf')
    }
    for (var i = 0, n = k.length; i < n; i++) {
      var p = k[i], v = source[p];
      if (a && Object.isFunction(v) && v.argumentNames().first() == '$super') {
        var m = v;
        v = (function(m) { return function() { return a[m].apply(this, arguments) } })(p).wrap(m);
        v.valueOf = method.valueOf.bind(method);
        v.toString = method.toString.bind(method)
      }
      this.prototype[p] = v
    }
    return this
  }
  return { create: create, Methods: { addMethods: addMethods } }
})();
/*--------------------------------------------------------------------------*/
/* Object */
(function() {
  function extend(d, s) {
    for (var k in s) d[k] = s[k];
    return d
  }
  function clone(o) { return extend({ }, o) }
  function keys(o) {
    var a = [];
    for (var k in o) a.push(k);
    return a
  }
  function values(o) {
    var a = [];
    for (var k in o) a.push(o[k]);
    return a
  }
  function isUndefined(o) { return typeof o === 'undefined' }
  function isFunction(o) { return typeof o === 'function' }
  function isHash(o) { return o instanceof Hash }
  function getClass(o) { return Object.prototype.toString.call(o).match(/^\[object\s(.*)\]$/)[1] }
  function isString(o) { return getClass(o) === 'String' }
  function isNumber(o) { return getClass(o) === 'Number' }
  function isArray(o) { return getClass(o) === 'Array' }
  function isElement(o) { return !!(o && o.nodeType == 1) }
  function inspect(o) {
    try {
      if (null === o) return 'null';
      if (isUndefined(o)) return 'undefined';
      return o.inspect ? o.inspect() : String(o)
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e
    }
  }
  function toHTML(o) { return o && o.toHTML ? o.toHTML() : String.interpret(o) }
  function toQueryString(o) { return $H(o).toQueryString() }
  function toJSON(o) {
    switch (typeof o) {
    case 'undefined': case 'function': case 'unknown': return;
    case 'boolean': return o.toString()
    }
    if (o === null) return 'null';
    if (o.toJSON) return o.toJSON();
    if (isElement(o)) return;
    var a = [];
    for (var k in o) {
      var v = toJSON(o[k]);
      if (!isUndefined(v)) a.push(k.toJSON() + ': ' + v)
    }
    return '{' + a.join(',') + '}'
  }
  extend(Object, {
    extend: extend,
    clone: clone,
    keys: keys,
    values: values,
    isUndefined: isUndefined,
    isFunction: isFunction,
    isHash: isHash,
    isString: isString,
    isNumber: isNumber,
    isArray: isArray,
    isElement: isElement,
    inspect: inspect,
    toHTML: toHTML,
    toQueryString: toQueryString,
    toJSON: toJSON
  });
})();
/*--------------------------------------------------------------------------*/
/* Function */
Object.extend(Function.prototype, (function() {
  var slice = Array.prototype.slice;
  function update(array, args) {
    for (var arrayLength = array.length, length = args.length; --length >= 0; )
      array[arrayLength + length] = args[length];
    return array
  }
  function merge(array, args) {
    return update(array = slice.call(array, 0), args)
  }
  function argumentNames() {
    var names = this.toString()
      .match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
      .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
      .replace(/\s+/g, '')
      .split(',');
    return names.length == 1 && !names[0] ? [] : names
  }
  function bind(context) {
    if (arguments.length < 2 && Object.isUndefined(arguments[0])) return this;
    var __method = this, args = slice.call(arguments, 1);
    return function() {
      var a = merge(args, arguments);
      return __method.apply(context, a)
    }
  }
  function bindAsEventListener(context) {
    var __method = this, args = slice.call(arguments, 1);
    return function(event) {
      var a = update([event || window.event], args);
      return __method.apply(context, a)
    }
  }
  function curry() {
    if (!arguments.length) return this;
    var __method = this, args = slice.call(arguments, 0);
    return function() {
      var a = merge(args, arguments);
      return __method.apply(this, a)
    }
  }
  function delay(timeout) {
    var __method = this, args = slice.call(arguments, 1);
    return window.setTimeout(function() { return __method.apply(__method, args) }, timeout * 1000)
  }
  function defer() {
    return this.delay.apply(this, args = update([.01], arguments))
  }
  function wrap(wrapper) {
    var __method = this;
    return function() {
      return wrapper.apply(this, update([__method.bind(this)], arguments))
    }
  }
  function methodize() {
    if (this._methodized) return this._methodized;
    var __method = this;
    return this._methodized = function() { return __method.apply(null, update([this], arguments)) }
  }
  return {
    argumentNames: argumentNames,
    bind: bind,
    bindAsEventListener: bindAsEventListener,
    curry: curry,
    delay: delay,
    defer: defer,
    wrap: wrap,
    methodize: methodize
  }
})());
/*--------------------------------------------------------------------------*/
/* Date */
Date.prototype.toJSON = function() {
  return '"' + this.getUTCFullYear() + '-' +
    (this.getUTCMonth() + 1).toPaddedString(2) + '-' +
    this.getUTCDate().toPaddedString(2) + 'T' +
    this.getUTCHours().toPaddedString(2) + ':' +
    this.getUTCMinutes().toPaddedString(2) + ':' +
    this.getUTCSeconds().toPaddedString(2) + 'Z"'
};
/*--------------------------------------------------------------------------*/
/* RegExp */
RegExp.prototype.match = RegExp.prototype.test;
RegExp.escape = function(str) { return String(str).replace(/[!$()*+.\/:=?[\\\]^\{|}]/g, '\\$&') };
/*--------------------------------------------------------------------------*/
/* PeriodicalExecuter */
var PeriodicalExecuter = Class.create({
  initialize: function(callback, frequency) {
    this.callback = callback;
    this.frequency = frequency;
    this.currentlyExecuting = false;
    this.registerCallback()
  },
  registerCallback: function() { this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000) },
  execute: function() { this.callback(this) },
  stop: function() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null
  },
  onTimerEvent: function() {
    if (!this.currentlyExecuting) {
      try {
        this.currentlyExecuting = true;
        this.execute()
      } catch(e) { /* empty catch for clients that don't support try/finally */ } finally { this.currentlyExecuting = false }
    }
  }
});
/*--------------------------------------------------------------------------*/
/* String */
Object.extend(String, {
  interpret: function(value) { return value == null ? '' : String(value) },
  specialChar: {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\v': '\\v',
    '\f': '\\f',
    '\r': '\\r',
    '\'': '\\\'',
    '\"': '\\\"',
    '\\': '\\\\'
  }
});
Object.extend(String.prototype, (function() {
  function empty() { return this == '' }
  function blank() { return /^\s*$/.test(this) }
  function include(pattern) { return this.indexOf(pattern) > -1 }
  function startsWith(pattern) { return this.indexOf(pattern) === 0 }
  function endsWith(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.lastIndexOf(pattern) === d;
  }
  function toArray() { return this.split('') }
  function succ() { return this.slice(0, this.length - 1) + String.fromCharCode(this.charCodeAt(this.length - 1) + 1) }
  function times(count) { return count < 1 ? '' : new Array(count + 1).join(this) }
  function prepareReplacement(replacement) {
    if (Object.isFunction(replacement)) return replacement;
    var template = new Template(replacement);
    return function(match) { return template.evaluate(match) }
  }
  function gsub(pattern, replacement) {
    var result = '', source = this, match;
    replacement = prepareReplacement(replacement);
    if (Object.isString(pattern)) pattern = RegExp.escape(pattern);
    if (!(pattern.length || pattern.source)) {
      replacement = replacement('');
      return replacement + source.split('').join(replacement) + replacement
    }
    while (source.length > 0) {
      if (match = source.match(pattern)) {
        result += source.slice(0, match.index) + String.interpret(replacement(match));
        source = source.slice(match.index + match[0].length)
      } else {
        result += source;
        source = ''
      }
    }
    return result
  }
  function sub(pattern, replacement, count) {
    replacement = prepareReplacement(replacement);
    count = Object.isUndefined(count) ? 1 : count;
    return this.gsub(pattern, function(match) {
      if (--count < 0)
        return match[0];
      return replacement(match)
    })
  }
  function scan(pattern, iterator) {
    this.gsub(pattern, iterator);
    return String(this)
  }
  function inspect() {
    var quot, re;
    if (this.indexOf("'") >= 0) quot = '"', re = /[\x00-\x1f"\\\x7f]/;
    else quot = "'", re = /[\x00-\x1f\\\x7f]/;
    return quot + this.gsub(re, function(match) {
        var c = String.specialChar[match[0]];
        return c ? c : '\\x' + match[0].charCodeAt().toPaddedString(2, 16);
      }) + quot;
  }
  function truncate(length, truncation) {
    length = length || 30;
    truncation = Object.isUndefined(truncation) ? '...' : truncation;
    return this.length > length
      ? this.slice(0, length - truncation.length) + truncation
      : String(this)
  }
  function strip() { return this.trim() }
  function stripTags() { return this.replace(/<\/?[^>]+>?/gi, '') }
  function stripScripts() { return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '') }
  function extractScripts() {
    var matchOne = new RegExp(Prototype.ScriptFragment, 'im');
    return (this.match(new RegExp(Prototype.ScriptFragment, 'img')) || []).map(
      function(scriptTag) { return (scriptTag.match(matchOne) || ['', ''])[1] })
  }
  function evalScripts() { return this.extractScripts().map(function(script) { return eval(script) }) }
  function escapeHTML() {
    escapeHTML.text.data = this;
    return escapeHTML.div.innerHTML
  }
  function unescapeHTML() {
    var div = document.createElement('DIV');
    div.innerHTML = this.stripTags();
    return div.childNodes[0]
      ? (div.childNodes.length > 1
        ? $A(div.childNodes).inject('', function(memo, node) { return memo+node.nodeValue })
        : div.childNodes[0].nodeValue)
      : ''
  }
  function toQueryParams(separator) {
    var match = this.strip().match(/([^?#]*)(#.*)?$/);
    if (!match) return { };
    return match[1].split(separator || '&').inject({ }, function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift());
        var value = pair.length > 1 ? pair.join('=') : pair[0];
        if (value != undefined) value = decodeURIComponent(value);
        if (key in hash) {
          if (!Object.isArray(hash[key])) hash[key] = [hash[key]];
          hash[key].push(value);
        } else hash[key] = value;
      }
      return hash
    });
  }
  function dasherize() { return this.gsub(/_/,'-') }
  function capitalize() { return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase() }
  function underscore() { return this.gsub(/::/, '/').gsub(/([A-Z]+)([A-Z][a-z])/,'#{1}_#{2}').gsub(/([a-z\d])([A-Z])/,'#{1}_#{2}').gsub(/-/,'_').toLowerCase() }
  function camelize() {
    var parts = this.split('-'), len = parts.length;
    if (len == 1) return parts[0];
    var camelized = this.charAt(0) == '-' ? parts[0].charAt(0).toUpperCase() + parts[0].substring(1) : parts[0];
    for (var i = 1; i < len; i++) camelized += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);
    return camelized
  }
  function toJSON() { return this.inspect(true) }
  function unfilterJSON(filter) { return this.sub(filter || Prototype.JSONFilter, '#{1}') }
  function isJSON() {
    if (this.blank()) return false;
    return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(this.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, ''));
  }
  function evalJSON(sanitize) {
    var json = this.unfilterJSON();
    try {
      if (!sanitize || json.isJSON()) return eval('(' + json + ')')
    } catch (e) { }
    throw new SyntaxError('Badly formed JSON string: ' + this.inspect())
  }
  function interpolate(object, pattern) { return new Template(this, pattern).evaluate(object) }
  return {
    empty: empty,
    blank: blank,
    include: include,
    startsWith: startsWith,
    endsWith: endsWith,
    toArray: toArray,
    succ: succ,
    times: times,
    gsub: gsub,
    sub: sub,
    scan: scan,
    inspect: inspect,
    truncate: truncate,
    strip: strip,
    stripTags: stripTags,
    stripScripts: stripScripts,
    extractScripts: extractScripts,
    evalScripts: evalScripts,
    escapeHTML: escapeHTML,
    unescapeHTML: unescapeHTML,
    toQueryParams: toQueryParams, parseQuery: toQueryParams,
    dasherize: dasherize,
    capitalize: capitalize,
    underscore: underscore,
    camelize: camelize,
    toJSON: toJSON,
    unfilterJSON: unfilterJSON,
    isJSON: isJSON,
    evalJSON: evalJSON,
    interpolate: interpolate
  };
})());
Object.extend(String.prototype.escapeHTML, {
  div: document.createElement('DIV'),
  text: document.createTextNode('')
});
String.prototype.escapeHTML.div.appendChild(String.prototype.escapeHTML.text);
if ('<\n>'.escapeHTML() !== '&lt;\n&gt;') {
  String.prototype.escapeHTML = function() {
    return this.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
if ('&lt;\n&gt;'.unescapeHTML() !== '<\n>') {
  String.prototype.unescapeHTML = function() {
    return this.stripTags().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }
}
function $w(string) {
  if (!Object.isString(string)) return [];
  return (string = string.strip()) ? string.split(/\s+/) : [];
}
/*--------------------------------------------------------------------------*/
/* Template */
var Template = Class.create({
  initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern = pattern || Template.Pattern
  },
  evaluate: function(object) {
    if (Object.isFunction(object.toTemplateReplacements)) object = object.toTemplateReplacements();
    return this.template.gsub(this.pattern, function(match) {
      if (null == object) return '';
      var before = match[1] || '';
      if ('\\' == before) return match[2];
      var ctx = object, expr = match[3], pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;
      if (null == (match = pattern.exec(expr))) return before;
      while (null != match) {
        var comp = match[1].startsWith('[') ? match[2].gsub('\\\\]', ']') : match[1];
        if (null == (ctx = ctx[comp]) || '' == match[3]) break;
        match = pattern.exec(expr = expr.substring('[' == match[3] ? match[1].length : match[0].length));
      }
      return before + String.interpret(ctx);
    });
  }
});
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;
/*--------------------------------------------------------------------------*/
/* Enumerable */
var Enumerable = (function() {
  var $break = { };
  function collect(iterator, context) {
    if (!iterator) iterator = Prototype.K;
    var r = [];
    try {
      this.each(function(v, k) { r.push(iterator.call(context, v, k)) });
    } catch (e) { if ($break != e) throw e }
    return r
  }
  function toArray() { return this.map() }
  function size() { return this.toArray().length }
  function inspect() { return '#<Enumerable:' + this.toArray().inspect() + '>' }
  function each(iterator, context) {
    if (!iterator) iterator = Prototype.K;
    var k = 0;
    try {
      this._each(function(v) { iterator.call(context, v, k++) })
    } catch (e) { if ($break != e) throw e }
    return this
  }
  function eachSlice(number, iterator, context) {
    var k = -number, a = this.toArray();
    if (k < 1) return a;
    var s = [];
    while ((k += number) < a.length) s.push(a.slice(index, k + number));
    return s.collect(iterator, context)
  }
  function inject(memo, iterator, context) {
    this.each(function(v, k) { memo = iterator.call(context, memo, v, k) });
    return memo
  }
  function all(iterator, context) {
    if (!iterator) iterator = Prototype.K;
    var r = true;
    this.each(function(v, k) { if (!iterator.call(context, v, k)) { r = false; throw $break } });
    return r
  }
  function any(iterator, context) {
    if (!iterator) iterator = Prototype.K;
    var r = false;
    this.each(function(v, k) { if (!!iterator.call(context, v, k)) { r = true; throw $break } });
    return r
  }
  function detect(iterator, context) {
    if (!iterator) iterator = Prototype.K;
    var r;
    this.each(function(v, k) { if (iterator.call(context, v, k)) { r = v; throw $break } });
    return r
  }
  function include(object) {
    if (Object.isFunction(this.indexOf) && this.indexOf(object) != -1) return true;
    var r = false;
    this.each(function(v) { if (v == object) { r = true; throw $break } });
    return r
  }
  function reject(iterator, context) {
    var a = [];
    this.each(function(v, k) { if (!iterator.call(context, v, k)) a.push(v) });
    return a
  }
  function findAll(iterator, context) {
    if (!iterator) iterator = Prototype.K;
    var a = [];
    this.each(function(v, k) { if (iterator.call(context, v, k)) a.push(v) });
    return a
  }
  function grep(filter, iterator, context) {
    if (Object.isString(filter)) filter = new RegExp(RegExp.escape(filter));
    if (!iterator) iterator = Prototype.K;
    var a = [];
    this.each(function(v, k) { if (filter.match(v)) a.push(iterator.call(context, v, k)) });
    return a
  }
  function inGroupsOf(number, fillWith) {
    if (Object.isUndefined(fillWith)) fillWith = null;
    return this.eachSlice(number, function(s) {
      while (s.length < number) s.push(fillWith);
      return s
    });
  }
  function invoke(method) {
    var a = $A(arguments).slice(1);
    return this.map(function(v) { return v[method].apply(v, a) })
  }
  function min(iterator, context) {
    if (!iterator) iterator = Prototype.K;
    var r;
    this.each(function(v, k) {
      v = iterator.call(context, v, k);
      if (null == r || v < r) r = v
    });
    return r
  }
  function max(iterator, context) {
    if (!iterator) iterator = Prototype.K;
    var r;
    this.each(function(v, k) {
      value = iterator.call(context, v, k);
      if (null == r || r < v) r = v
    });
    return r
  }
  function partition(iterator, context) {
    if (!iterator) iterator = Prototype.K;
    var p = [], q = [];
    this.each(function(v, k) { (iterator.call(context, v, k) ? p : q).push(v) });
    return [p, q];
  }
  function pluck(property) {
    var a = [];
    this.each(function(v) { a.push(v[property]) });
    return a;
  }
  function zip() {
    var iterator = Prototype.K, args = $A(arguments);
    if (Object.isFunction(args.last())) iterator = args.pop();
    var collections = [this].concat(args).map($A);
    return this.map(function(value, index) { return iterator(collections.pluck(index)) })
  }
  function sortBy(iterator, context) {
    return this.map(function(v, k) {
      return {v: v, k: iterator.call(context, v, k)}
    }).sort(function(a, b) {
      return (a = a.k) < (b = b.k) ? -1 : b < a ? 1 : 0
    }).pluck('v')
  }
  return {
    collect: collect, map: collect,
    entries: toArray,
    size: size,
    inspect: inspect,
    each: each,
    eachSlice: eachSlice,
    toArray: toArray,
    inject: inject,
    all: all, every: all,
    any: any, some: any,
    detect: detect, find: detect,
    include: include, member: include,
    reject: reject,
    findAll: findAll, select: findAll, filter: findAll,
    grep: grep,
    inGroupsOf: inGroupsOf,
    invoke: invoke,
    min: min,
    max: max,
    partition: partition,
    pluck: pluck,
    zip: zip,
    sortBy: sortBy
  };
})();
/*--------------------------------------------------------------------------*/
/* arrayProto */
(function() {
  function clear() { this.length = 0; return this }
  function size() { return this.length }
  function first() { return this[0] }
  function last() { return this[this.length - 1] }
  var arrayProto = Array.prototype;
  function each(iterator) { for (var i = 0, n = this.length; i < n; i++) iterator(this[i]) }
  var _each = arrayProto.forEach; // use native browser JS 1.6 implementation if available
  if (!_each) _each = each;
  function flatten() {
    return this.inject([], function(a, v) {
      if (Object.isArray(v)) return a.concat(v.flatten());
      a.push(v);
      return a;
    });
  }
  function compact() { return this.select(function(v) { return v != null }) }
  var slice = arrayProto.slice;
  function clone() { return slice.call(this, 0) }
  function without() {
    var values = slice.call(arguments, 0);
    return this.select(function(value) { return !values.include(value) })
  }
  function reverse(inline) { return (inline !== false ? this : this.toArray())._reverse() }
  function inspect() { return '[' + this.map(Object.inspect).join(',') + ']' }
  function toJSON() {
    var a = [];
    this.each(function(object) {
      var v;
      if (!Object.isUndefined(v = Object.toJSON(object))) a.push(v);
    });
    return '[' + a.join(',') + ']';
  }
  function concat() {
    var a = slice.call(this, 0);
    for (var i = 0, length = m; i < m; i++) {
      var item;
      if (Object.isArray(item = arguments[i]) && !('callee' in item))
        for (var j = 0, n = item.length; j < n; j++) a.push(item[j])
      else a.push(item)
    }
    return a
  }
  function indexOf(item, i) {
    var n = this.length;
    i || (i = 0);
    if (i < 0) i = n + i;
    for (; i < n; i++) if (this[i] === item) return i;
    return -1;
  }
  function lastIndexOf(item, i) {
    i = isNaN(i) ? this.length : (i < 0 ? this.length + i : i) + 1;
    var n = this.slice(0, i).reverse().indexOf(item);
    return (n < 0) ? n : i - n - 1;
  }
  function uniq(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value))) array.push(value);
      return array
    })
  }
  function intersect(array) {
    return this.uniq().findAll(function(item) { return array.detect(function(value) { return item === value }) })
  }
  Object.extend(arrayProto, Enumerable);
  if (!arrayProto._reverse) arrayProto._reverse = arrayProto.reverse;
  Object.extend(arrayProto, {
    clear: clear,
    size: size,
    first: first,
    last: last,
    _each: _each,
    compact: compact,
    flatten: flatten,
    clone: clone, toArray: clone,
    without: without,
    reverse: reverse,
    inspect: inspect,
    toJSON: toJSON,
    uniq: uniq,
    intersect: intersect
  });
  var CONCAT_ARGUMENTS_BUGGY = (function() {
    return [].concat(arguments)[0][0] !== 1
  })(1, 2)
  if (CONCAT_ARGUMENTS_BUGGY) arrayProto.concat = concat;
  if (!arrayProto.indexOf) arrayProto.indexOf = indexOf;
  if (!arrayProto.lastIndexOf) arrayProto.lastIndexOf = lastIndexOf
})();
/*--------------------------------------------------------------------------*/
/* Hash */
var Hash = Class.create(Enumerable, (function() {
  function clone() { return new Hash(this) }
  function initialize(object) { this._object = Object.isHash(object) ? object.toObject() : Object.clone(object) }
  function update(object) {
    return new Hash(object).inject(this, function(r, p) {
      r.set(p.key, p.value);
      return r
    });
  }
  function merge(object) { return this.clone().update(object) }
  function inspect() { return '#<Hash:{' + this.map(function(pair) { return pair.map(Object.inspect).join(':') }).join(',') + '}>' }
  function toObject() { return Object.clone(this._object) }
  function toJSON() { return Object.toJSON(this.toObject()) }
  function toQueryPair(key, value) {
    if (Object.isUndefined(value)) return key;
    return key + '=' + encodeURIComponent(String.interpret(value))
  }
  function toQueryString() {
    return this.inject([], function(results, pair) {
      var key = encodeURIComponent(pair.key), values = pair.value;
      if (values && typeof values == 'object') {
        if (Object.isArray(values)) return results.concat(values.map(toQueryPair.curry(key)))
      } else results.push(toQueryPair(key, values));
      return results;
    }).join('&')
  }
  function set(key, value) { return this._object[key] = value }
  function unset(key) { var v = this._object[key]; delete this._object[key]; return v }
  function get(key) { if (this._object[key] !== Object.prototype[key]) return this._object[key] }
  function _each(iterator) {
    for (var k in this._object) {
      var v = this._object[k], p = [k, value];
      p.key = k, p.value = v;
      iterator(pair)
    }
  }
  function keys() { return this.pluck('key') }
  function values() { return this.pluck('value') }
  function index(value) { var m; return (m = this.detect(function(pair) { return pair.value === value })) && m.key }
  return {
    clone: clone,
    initialize: initialize,
    update: update,
    merge: merge,
    inspect: inspect,
    toObject: toObject, toTemplateReplacements: toObject,
    toJSON: toJSON,
    toQueryString: toQueryString,
    set: set,
    unset: unset,
    get: get,
    _each: _each,
    keys: keys,
    values: values,
    index: index,
  };
})());
function $H(object) { return new Hash(object) };
Hash.from = $H;
/*--------------------------------------------------------------------------*/
/* ObjectRange */
var ObjectRange = Class.create(Enumerable, (function() {
  function initialize(start, end, exclusive) { this.start = start, this.end = end, this.exclusive = exclusive }
  function include(value) { return !(value < this.start) && (this.exclusive ? value < this.end : value <= this.end) }
  function _each(iterator) { for (var v = this.start; this.include(v); v = v.succ()) iterator(v) }
  return {
    initialize: initialize,
    include: include,
    _each: _each,
  };
})());
function $R(start, end, exclusive) { return new ObjectRange(start, end, exclusive) }
/*--------------------------------------------------------------------------*/
/* Number */
Object.extend(Number.prototype, (function() {
  function succ() { return this + 1 }
  function abs() { return Math.abs(this); }
  function round() { return Math.round(this); }
  function ceil() { return Math.ceil(this); }
  function floor() { return Math.floor(this); }
  function times(iterator, context) {
    $R(0, this, true).each(iterator, context);
    return this;
  }
  function toJSON() { return isFinite(this) ? this.toString() : 'null' }
  function toPaddedString(length, radix) {
    var s = this.toString(radix || 10);
    return '0'.times(length - s.length) + s
  }
  function toColorPart() { return this.toPaddedString(2, 16) }
  return {
    succ: succ,
    abs: abs,
    round: round,
    ceil: ceil,
    floor: floor,
    times: times,
    toJSON: toJSON,
    toPaddedString: toPaddedString,
    toColorPart: toColorPart,
  };
})());
/*--------------------------------------------------------------------------*/
/* Element */
function $(element) {
  if (arguments.length > 1) {
    var e = [];
    for (var n = arguments.length, i = 0; i < n; i++) e.push($(arguments[i]));
    return e
  }
  if (Object.isString(element)) element = document.getElementById(element);
  return Element.extend(element)
}
/*--------------------------------------------------------------------------*/
/* Ajax */
var Ajax = {
  activeRequestCount: 0,
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest()},
      function() {return new ActiveXObject('Msxml2.XMLHTTP')},
      function() {return new ActiveXObject('Microsoft.XMLHTTP')}
    ) || false
  }
};
Ajax.Responders = {
  responders: [],
  _each: function(iterator) { this.responders._each(iterator) },
  register: function(responder) { if (!this.include(responder)) this.responders.push(responder) },
  unregister: function(responder) { this.responders = this.responders.without(responder) },
  dispatch: function(callback, request, transport, json) {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) { }
    })
  }
};
Object.extend(Ajax.Responders, Enumerable);
Ajax.Responders.register({
  onCreate: function() { Ajax.activeRequestCount++ },
  onComplete: function() { Ajax.activeRequestCount-- }
});
Ajax.Base = Class.create({
  initialize: function(options) {
    this.options = {
      method: 'POST',
      asynchronous: true,
      contentType: 'application/x-www-form-urlencoded',
      encoding: 'UTF-8',
      parameters: '',
      evalJSON: true,
      evalJS: true
    };
    Object.extend(this.options, options || { });
    this.options.method = this.options.method.toUpperCase();
    if (Object.isString(this.options.parameters)) this.options.parameters = this.options.parameters.toQueryParams();
    else if (Object.isHash(this.options.parameters)) this.options.parameters = this.options.parameters.toObject();
  }
});
Ajax.Request = Class.create(Ajax.Base, {
  _complete: false,
  initialize: function($super, url, options) { $super(options), this.transport = Ajax.getTransport(), this.request(url) },
  dispatchException: function(exception) { (this.options.onException || Prototype.emptyFunction)(this, exception), Ajax.Responders.dispatch('onException', this, exception) },
  request: function(url) {
    var params = Object.clone(this.options.parameters);
    if (!['GET', 'POST'].include(this.method = this.options.method.toUpperCase())) { params._method = this.method, this.method = 'POST' }
    this.url = url, this.parameters = params;
    if (params = Object.toQueryString(params)) {
      if (this.method == 'GET') this.url += (this.url.include('?') ? '&' : '?') + params;
      else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent)) params += '&_=';
    }
    try {
      var response = new Ajax.Response(this);
      if (this.options.onCreate) this.options.onCreate(response);
      Ajax.Responders.dispatch('onCreate', this, response);
      this.transport.open(this.method.toUpperCase(), this.url, this.options.asynchronous);
      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);
      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders(), this.body = this.method == 'POST' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);
      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType) this.onStateChange();
    } catch (e) { this.dispatchException(e) }
  },
  onStateChange: function() {
    var s;
    if ((s = this.transport.readyState) > 1 && !((s == 4) && this._complete)) this.respondToReadyState(this.transport.readyState)
  },
  setRequestHeaders: function() {
    var headers = {
      Accept: 'text/javascript,text/html,application/xml,text/xml,*/*',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Prototype-Version': Prototype.Version
    };
    if (this.method == 'POST') {
      headers['Content-type'] = this.options.encoding
        ? this.options.contentType + ';charset=' + this.options.encoding
        : this.options.contentType
      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType && (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005) headers['Connection'] = 'close'
    }
    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;
      if (Object.isFunction(extras.push)) for (var i = 0, n = extras.length; i < n; i += 2) headers[extras[i]] = extras[i + 1];
      else $H(extras).each(function(pair) { headers[pair.key] = pair.value })
    }
    for (var k in headers) this.transport.setRequestHeader(name, headers[k])
  },
  getStatus: function() {
    try {
      return this.transport.status || 0
    } catch (e) { return 0 }
  },
  success: function() {
    var s;
    return !(s = this.getStatus()) || s >= 200 && s < 300
  },
  getHeader: function(n) {
    try {
      return this.transport.getResponseHeader(n) || null
    } catch (e) { return null }
  },
  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState], response = new Ajax.Response(this);
    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + response.status] ||
         this.options['on' + (this.success() ? 'Success' : 'Failure')] ||
         Prototype.emptyFunction)(response, response.headerJSON)
      } catch (e) { this.dispatchException(e) }
      var contentType;
      if (this.options.evalJS == 'force' ||
          (this.options.evalJS && this.isSameOrigin() &&
           (contentType = response.getHeader('Content-type')) &&
           contentType.match(/^\s*(application|text)\/(x-)?(ecm|jav)ascript(;.*)?\s*$/i)))
        this.evalResponse()
    }
    try {
      (this.options['on' + state] ||
       Prototype.emptyFunction)(response, response.headerJSON);
      Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON)
    } catch (e) { this.dispatchException(e) }
    if (state == 'Complete') this.transport.onreadystatechange = Prototype.emptyFunction
  },
  isSameOrigin: function() {
    var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
    return !m || (m[0] == '#{h}//#{d}#{p}'.interpolate({
      h: location.protocol,
      d: document.domain,
      p: location.port ? ':' + location.port : ''
    }))
  },
  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilterJSON())
    } catch (e) { this.dispatchException(e) }
  },
});
Ajax.Request.Events = ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];
Ajax.Response = Class.create({
  status: 0,
  statusText: '',
  getStatus: Ajax.Request.prototype.getStatus,
  getStatusText: function() { try { return this.transport.statusText || '' } catch (e) { return '' } },
  getHeader: Ajax.Request.prototype.getHeader,
  getAllHeaders: function() { try { return this.getAllResponseHeaders() } catch (e) { return null } },
  getAllResponseHeaders: function() { return this.transport.getAllResponseHeaders(); },
  getResponseHeader: function(n) { return this.transport.getResponseHeader(n) },
  _getHeaderJSON: function() {
    var j;
    if (!(j = this.getHeader('X-JSON'))) return null;
    j = decodeURIComponent(escape(j));
    try { return j.evalJSON(this.request.options.sanitizeJSON || !this.request.isSameOrigin()) } catch (e) { this.request.dispatchException(e) }
  },
  _getResponseJSON: function() {
    var o = this.request.options;
    if (!o.evalJSON || (o.evalJSON != 'force' && !(this.getHeader('Content-type') || '').include('application/json')) || this.responseText.blank()) return null;
    try { return this.responseText.evalJSON(o.sanitizeJSON || !this.request.isSameOrigin()) } catch (e) { this.request.dispatchException(e) }
  },
  initialize: function(request) {
    var t = this.transport = (this.request = request).transport, s = this.readyState = t.readyState;
    if ((s > 2 && !Prototype.Browser.IE) || s == 4) {
      this.status = this.getStatus();
      this.statusText = this.getStatusText();
      this.headerJSON = this._getHeaderJSON();
      this.responseText = String.interpret(t.responseText);
      if (s == 4) {
        var x;
        this.responseJSON = this._getResponseJSON();
        this.responseXML = Object.isUndefined(x = t.responseXML) ? null : x;
      }
    }
  },
});
Ajax.Updater = Class.create(Ajax.Request, {
  updateContent: function(responseText) {
    var r = this.container[this.success() ? 'success' : 'failure'], o = this.options;
    if (!o.evalScripts) responseText = responseText.stripScripts();
    if (r = $(r))
      if (o.insertion) {
        if (Object.isString(o.insertion)) {
          var i;
          (i = {})[o.insertion] = responseText, r.insert(i)
        } else o.insertion(r, responseText)
      } else r.update(responseText)
  },
  initialize: function($super, container, url, options) {
    this.container = {
      success: container.success || container,
      failure: container.failure || (container.success ? null : container)
    };
    options = Object.clone(options);
    var c = options.onComplete;
    options.onComplete = (function(response, json) {
      this.updateContent(response.responseText);
      if (Object.isFunction(c)) c(response, json);
    }).bind(this);
    $super(url, options)
  }
});
Ajax.PeriodicalUpdater = Class.create(Ajax.Base, {
  onTimerEvent: function() { this.updater = new Ajax.Updater(this.container, this.url, this.options) },
  start: function() { this.options.onComplete = this.updateComplete.bind(this), this.onTimerEvent() },
  stop: function() { this.updater.options.onComplete = undefined, clearTimeout(this.timer), (this.onComplete || Prototype.emptyFunction).apply(this, arguments) },
  updateComplete: function(response) {
    if (this.options.decay) {
      this.decay = response.responseText == this.lastText ? this.decay * this.options.decay : 1;
      this.lastText = response.responseText;
    }
    this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
  },
  initialize: function($super, container, url, options) {
    $super(options);
    this.container = container;
    this.url = url;
    this.updater = { };
    this.onComplete = this.options.onComplete;
    this.frequency = this.options.frequency || 2;
    this.decay = this.options.decay || 1;
    this.start();
  },
});
/*--------------------------------------------------------------------------*/
/* DOM */
if (Prototype.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var q = document.evaluate(expression, $(parentElement) || document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null), r = [];
    for (var i = 0, n = q.snapshotLength; i < n; i++) r.push(Element.extend(q.snapshotItem(i)));
    return r
  };
}
if (!window.Node) var Node = { };
if (!Node.ELEMENT_NODE) Object.extend(Node, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  });
(function(global) {
  var SETATTRIBUTE_IGNORES_NAME = (function(){
    var root = document.documentElement, elForm = document.createElement('FORM'), elInput = document.createElement('INPUT');
    elInput.setAttribute('name', 'test'), elForm.appendChild(elInput), root.appendChild(elForm);
    var isBuggy = elForm.elements ? (typeof elForm.elements.test == "undefined") : null;
    root.removeChild(elForm), elForm = elInput = null;
    return isBuggy
  })();
  var e = global.Element;
  global.Element = function(tagName, attributes) {
    attributes = attributes || { };
    tagName = tagName.toLowerCase();
    var cache = Element.cache;
    if (SETATTRIBUTE_IGNORES_NAME && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes)
    }
    if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));
    return Element.writeAttribute(cache[tagName].cloneNode(false), attributes);
  }
  if (e) {
    Object.extend(global.Element, e);
    global.Element.prototype = e.prototype
  }
})(this);
Element.cache = { };
Element.idCounter = 1;
Element._attributeTranslations = {
  write: {
    names: {
      className: 'class',
      htmlFor: 'for'
    },
    values: { }
  }
};
Element.Methods = {
  visible: function(element) { return $(element).style.display != 'none' },
  hide: function(element) {
    (element = $(element)).style.display = 'none';
    return element;
  },
  show: function(element) {
    (element = $(element)).style.display = '';
    return element;
  },
  toggle: function(element) {
    if (Element.visible(element = $(element))) Element.hide(element) else Element.show(element);
    return element;
  },
  scrollTo: function(element) {
    var pos;
    window.scrollTo((pos = (element = $(element)).cumulativeOffset())[0], pos[1]);
    return element
  },
  remove: function(element) {
    (element = $(element)).parentNode.removeChild(element);
    return element;
  },
  update: (function(){
    var SELECT_ELEMENT_INNERHTML_BUGGY = (function(){
      var r = false, var s = document.createElement('SELECT');
      try {
        s.innerHTML = '<option value="0">0</option>';
        r = !s.options || !s.options[0] || s.options[0].nodeName.toUpperCase() !== 'OPTION';
      } catch (e) { r = true }
      s = null;
      return r;
    })();
    var TABLE_ELEMENT_INNERHTML_BUGGY = (function(){
      var r = false, t = document.createElement('TABLE');
      try {
        if (t.tBodies) {
          t.innerHTML = '<tbody><tr><td>test</td></tr></tbody>';
          r = typeof(e.tBodies[0]) == 'undefined';
        }
      } catch (e) { r = true }
      t = null;
      return r;
    })();
    var SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING = (function () {
      var r = false, s = document.createElement('SCRIPT');
      try {
        s.appendChild(document.createTextNode(''));
        r = !s.firstChild || s.firstChild && s.firstChild.nodeType !== 3;
      } catch (e) { r = true }
      s = null;
      return r;
    })();
    return function(element, content) {
      element = $(element);
      if (content && content.toElement) content = content.toElement();
      if (Object.isElement(content)) return element.update().insert(content);
      content = Object.toHTML(content);
      var t;
      if ((t = element.tagName.toUpperCase()) === 'SCRIPT' && SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING) {
        element.text = content;
        return element;
      }
      if ((SELECT_ELEMENT_INNERHTML_BUGGY || TABLE_ELEMENT_INNERHTML_BUGGY) && t in Element._insertionTranslations.tags)
        $A(element.childNodes).each(function(node) { element.removeChild(node) }),
        Element._getContentFromAnonymousElement(tagName, content.stripScripts()).each(function(node) { element.appendChild(node) })
      else element.innerHTML = content.stripScripts();
      content.evalScripts.bind(content).defer();
      return element
    }
  })(),
  replace: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    else if (!Object.isElement(content)) {
      content = Object.toHTML(content);
      var range;
      (range = element.ownerDocument.createRange()).selectNode(element);
      content.evalScripts.bind(content).defer();
      content = range.createContextualFragment(content.stripScripts());
    }
    element.parentNode.replaceChild(content, element);
    return element
  },
  insert: function(element, insertions) {
    element = $(element);
    if (Object.isString(insertions) || Object.isNumber(insertions) || Object.isElement(insertions)
        || (insertions && (insertions.toElement || insertions.toHTML)))
      insertions = { bottom: insertions };
    for (var p in insertions) { /* before|top|bottom|after */
      var c = insertions[p], i = Element._insertionTranslations[p = p.toLowerCase()];
      if (c && c.toElement) c = c.toElement();
      if (Object.isElement(c)) {
        i(element, c);
        continue
      }
      var t = ((p == 'before' || p == 'after') ? element.parentNode : element).tagName.toUpperCase();
      var n = Element._getContentFromAnonymousElement(t, (c = Object.toHTML(c)).stripScripts());
      if (p == 'top' || p == 'after') n.reverse();
      n.each(i.curry(element));
      c.evalScripts.bind(c).defer()
    }
    return element
  },
  wrap: function(element, wrapper, attributes) {
    element = $(element);
    if (Object.isElement(wrapper)) $(wrapper).writeAttribute(attributes || { });
    else if (Object.isString(wrapper)) wrapper = new Element(wrapper, attributes);
    else wrapper = new Element('DIV', wrapper);
    if (element.parentNode) element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    return wrapper
  },
  inspect: function(element) {
    element = $(element);
    var r = [element.tagName.toLowerCase()]
    $H({id: 'id', className: 'class'}).each(function(a) {
      var v = element[a.first()];
      if (v) r.push(a.last() + '=' + v.toString().inspect(true))
    });
    return '<' + r.join(' ') + '>'
  },
  recursivelyCollect: function(element, property) {
    element = $(element);
    var r = [];
    while (element = element[property]) if (element.nodeType == 1) r.push(Element.extend(element));
    return r
  },
  previousSiblings: function(element) { return $(element).recursivelyCollect('previousSibling') },
  nextSiblings: function(element) { return $(element).recursivelyCollect('nextSibling') },
  siblings: function(element) { return (element = $(element)).previousSiblings().reverse().concat(element.nextSiblings()) },
  ancestors: function(element) { return $(element).recursivelyCollect('parentNode') },
  descendants: function(element) { return Element.select(element, '*') },
  empty: function(element) { return $(element).innerHTML.blank() },
  cleanWhitespace: function(element) {
    element = $(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !/\S/.test(node.nodeValue)) element.removeChild(node);
      node = nextNode
    }
    return element
  },
  firstDescendant: function(element) {
    element = $(element).firstChild;
    while (element && element.nodeType != 1) element = element.nextSibling;
    return $(element)
  },
  immediateDescendants: function(element) {
    if (!(element = $(element).firstChild)) return [];
    while (element && element.nodeType != 1) element = element.nextSibling;
    if (element) return [element].concat($(element).nextSiblings());
    return []
  },
  up: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(element.parentNode);
    var s = element.ancestors();
    return Object.isNumber(expression) ? s[expression] : Selector.findElement(s, expression, index)
  },
  down: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return element.firstDescendant();
    return Object.isNumber(expression) ? element.descendants()[expression] : Element.select(element, expression)[index || 0]
  },
  previous: function(element, expression, index) {
    if (arguments.length == 1) return $(Selector.handlers.previousElementSibling(element = $(element)));
    var s = (element = $(element)).previousSiblings();
    return Object.isNumber(expression) ? s[expression] : Selector.findElement(s, expression, index)
  },
  next: function(element, expression, index) {
    if (arguments.length == 1) return $(Selector.handlers.nextElementSibling($(element)));
    var s = (element = $(element)).nextSiblings();
    return Object.isNumber(expression) ? s[expression] : Selector.findElement(s, expression, index)
  },
  select: function() {
    var a;
    return Selector.findChildElements($((a = $A(arguments)).shift()), a);
  },
  adjacent: function() {
    var a, e;
    return Selector.findChildElements(e = $((a = $A(arguments)).shift()).parentNode, args).without(e)
  },
  descendantOf: function(element, ancestor) {
    element = $(element), ancestor = $(ancestor);
    if (element.compareDocumentPosition) return (element.compareDocumentPosition(ancestor) & 8) === 8;
    if (ancestor.contains) return ancestor.contains(element) && ancestor !== element;
    while (element = element.parentNode) if (element == ancestor) return true;
    return false
  },
  match: function(element, selector) {
    if (Object.isString(selector)) selector = new Selector(selector);
    return selector.match($(element))
  },
  identify: function(element) {
    element = $(element);
    var i;
    if (i = element.readAttribute('id')) return i;
    do { i = 'anonymous_element_' + Element.idCounter++ } while ($(i));
    element.writeAttribute('id', i);
    return i
  },
  readAttribute: (function(){
    var iframeGetAttributeThrowsError = (function(){
      var r = false, e = document.createElement('IFRAME');
      document.documentElement.appendChild(e);
      try { e.getAttribute('type', 2) } catch(e) { r = true }
      document.documentElement.removeChild(e), e = null;
      return r
    })();
    return function(element, name) {
      element = $(element);
      if (iframeGetAttributeThrowsError && name === 'type' && element.tagName.toUpperCase() == 'IFRAME') return element.getAttribute('type');
      if (Prototype.Browser.IE) {
        var t = Element._attributeTranslations.read;
        if (t.values[name]) return t.values[name](element, name);
        if (t.names[name]) name = t.names[name];
        if (name.include(':')) return (!element.attributes || !element.attributes[name]) ? null : element.attributes[name].value
      }
      return element.getAttribute(name)
    }
  })(),
  writeAttribute: function(element, name, value) {
    element = $(element);
    var t = Element._attributeTranslations.write;
    var attributes;
    if (typeof(name) == 'object') attributes = name
    else attributes = {}, attributes[name] = Object.isUndefined(value) ? true : value;
    for (var attr in attributes) {
      name = t.names[attr] || attr;
      value = attributes[attr];
      if (t.values[attr]) name = t.values[attr](element, value);
      if (value === false || value === null) element.removeAttribute(name);
      else if (value === true) element.setAttribute(name, name);
      else element.setAttribute(name, value)
    }
    return element
  },
  classNames: function(element) { return new Element.ClassNames(element) },
  hasClassName: function(element, className) {
    if (!(element = $(element))) return;
    var elementClassName = element.className;
    return elementClassName.length > 0 && (elementClassName == className || new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName))
  },
  addClassName: function(element, className) {
    if (!(element = $(element))) return;
    if (!element.hasClassName(className)) element.className += (element.className ? ' ' : '') + className;
    return element
  },
  removeClassName: function(element, className) {
    if (!(element = $(element))) return;
    element.className = element.className.replace(new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ').strip();
    return element
  },
  toggleClassName: function(element, className) {
    if (!(element = $(element))) return;
    return (element.hasClassName(className) ? element.removeClassName : element.addClassName)(className)
  },
  getOpacity: function(element) { return $(element).getStyle('opacity') },
  getStyle: function(element, style) {
    style = style == 'float' ? 'cssFloat' : style.camelize();
    var v;
    if (!(v = (element = $(element)).style[style]) || v == 'auto') {
      var c;
      v = (c = document.defaultView.getComputedStyle(element, null)) ? c[style] : null
    }
    return (style == 'opacity') ? (v ? parseFloat(v) : 1) : (v == 'auto' ? null : value)
  },
  setOpacity: function(element, value) {
    (element = $(element)).style.opacity = (value == 1 || value === '') ? '' : (value < .00001 ? 0 : value);
    return element
  },
  setStyle: function(element, styles) {
    element = $(element);
    var elementStyle = element.style, match;
    if (Object.isString(styles)) {
      styles == '' || element.style.cssText += ';' + styles;
      return styles.include('opacity') ? element.setOpacity(styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element
    }
    for (var property in styles)
      if (property == 'opacity') element.setOpacity(styles[property]);
      else elementStyle[(property == 'float' || property == 'cssFloat') ?
        (Object.isUndefined(elementStyle.styleFloat) ? 'cssFloat' : 'styleFloat') : property] = styles[property];
    return element
  },
  getDimensions: function(element) {
    var d;
    if ((d = (element = $(element)).getStyle('display')) != 'none' && d != null)
      return {width: element.offsetWidth, height: element.offsetHeight}; // Safari bug
    var s; var v = (s = element.style).visibility, p = s.position, d = s.display;
    s.visibility = 'hidden', s.display = 'block';
    if (originalPosition != 'fixed') s.position = 'absolute'; // Switching fixed to absolute causes issues in Safari
    var w = element.clientWidth, h = element.clientHeight;
    s.display = d, s.position = p, s.visibility = v;
    return {width: w, height: h}
  },
  getHeight: function(element) { return $(element).getDimensions().height },
  getWidth: function(element) { return $(element).getDimensions().width },
  makePositioned: function(element) {
    var pos;
    if (!(pos = Element.getStyle(element = $(element), 'position')) || pos == 'static') {
      var s;
      element._madePositioned = true, (s = element.style).position = 'relative';
      if (Prototype.Browser.Opera) s.top = s.left = 0
    }
    return element
  },
  undoPositioned: function(element) {
    if ((element = $(element))._madePositioned) element._madePositioned = undefined,
      element.style.position = element.style.top = element.style.left = element.style.bottom = element.style.right = '';
    return element
  },
  makeClipping: function(element) {
    if ((element = $(element))._overflow) return element;
    element._overflow = Element.getStyle(element, 'overflow') || 'auto';
    if (element._overflow !== 'hidden') element.style.overflow = 'hidden';
    return element
  },
  undoClipping: function(element) {
    if (!(element = $(element))._overflow) return element;
    element.style.overflow = element._overflow == 'auto' ? '' : element._overflow, element._overflow = null;
    return element
  },
  cumulativeOffset: function(element) {
    var l = 0, t = 0;
    do {
      l += element.offsetLeft || 0, t += element.offsetTop || 0
    } while (element = element.offsetParent);
    return Element._returnOffset(l, t)
  },
  cumulativeScrollOffset: function(element) {
    var l = 0, t = 0;
    do {
      l += element.scrollLeft || 0, t += element.scrollTop || 0;
    } while (element = element.parentNode);
    return Element._returnOffset(l, t);
  },
  positionedOffset: function(element) {
    var l = 0, t = 0;
    do {
      l += element.offsetLeft || 0, t += element.offsetTop || 0;
      if ((element = element.offsetParent) && (element.tagName.toUpperCase() == 'BODY' || Element.getStyle(element, 'position') !== 'static') break;
    } while (element);
    return Element._returnOffset(l, t)
  },
  viewportOffset: function(element) {
    var l = 0, t = 0;
    var e = element;
    do {
      l += e.offsetLeft || 0, t += e.offsetTop || 0;
      if (e.offsetParent == document.body && Element.getStyle(e, 'position') == 'absolute') break
    } while (e = e.offsetParent);
    e = element;
    do {
      if (!Prototype.Browser.Opera || (element.tagName && (element.tagName.toUpperCase() == 'BODY')))
        l -= e.scrollLeft || 0, t -= e.scrollTop  || 0
    } while (e = e.parentNode);
    return Element._returnOffset(l, t);
  },
  absolutize: function(element) {
    if ((element = $(element)).getStyle('position') == 'absolute') return element;
    var o, s; var l = (o = element.positionedOffset())[0], t = o[1], w = element.clientWidth, h = element.clientHeight;
    element._originalLeft = l - parseFloat((s = element.style).left || 0), element._originalTop = t - parseFloat(s.top || 0),
    element._originalWidth = s.width, element._originalHeight = s.height;
    s.left = l + 'px', s.top = t + 'px', s.width = w + 'px', s.height = h + 'px', s.position = 'absolute';
    return element
  },
  relativize: function(element) {
    if ((element = $(element)).getStyle('position') == 'relative') return element;
    var s; var l = parseFloat((s = element.style).left || 0) - (element._originalLeft || 0), t = parseFloat(s.top || 0) - (element._originalTop || 0);
    s.left = l + 'px', s.top = t + 'px', s.width = element._originalWidth, s.height = element._originalHeight, s.position = 'relative';
    return element
  },
  getOffsetParent: function(element) {
    if (element.offsetParent) return $(element.offsetParent);
    if (element == document.body) return $(element);
    while ((element = element.parentNode) && element != document.body) if (Element.getStyle(element, 'position') != 'static') return $(element);
    return $(document.body)
  },
  clonePosition: function(element, source, options) {
    options = Object.extend({
      setLeft: true, offsetLeft: 0,
      setTop: true, offsetTop: 0,
      setWidth: true,
      setHeight: true,
    }, options || { });
    var v = (source = $(source)).viewportOffset(), d = [0, 0], p = null;
    if (Element.getStyle((element = $(element)), 'position') == 'absolute') d = (p = element.getOffsetParent()).viewportOffset();
    if (p == document.body) d[0] -= p.offsetLeft, d[1] -= p.offsetTop;
    var s = element.style;
    if (options.setLeft) s.left = (v[0] - d[0] + options.offsetLeft) + 'px';
    if (options.setTop) s.top = (v[1] - d[1] + options.offsetTop) + 'px';
    if (options.setWidth) s.width = source.offsetWidth + 'px';
    if (options.setHeight) s.height = source.offsetHeight + 'px';
    return element;
  }
};
Object.extend(Element.Methods, {
  getElementsBySelector: Element.Methods.select,
  childElements: Element.Methods.immediateDescendants
});
/*--------------------------------------------------------------------------*/
/* DOM: Opera */
if (Prototype.Browser.Opera) {
  Element.Methods.readAttribute = Element.Methods.readAttribute.wrap(function(proceed, element, attribute) {
      if (attribute === 'title') return element.title;
      return proceed(element, attribute)
    });
  Element.Methods.getStyle = Element.Methods.getStyle.wrap(function(proceed, element, style) {
      switch (style) {
      case 'left': case 'top': case 'right': case 'bottom':
        if (proceed(element, 'position') === 'static') return null;
      case 'height': case 'width':
        if (!Element.visible(element)) return null;
        var dim;
        if ((dim = parseInt(proceed(element, style), 10)) !== element['offset' + style.capitalize()]) return dim + 'px';
        return ((style === 'height')
          ? ['border-top-width', 'border-bottom-width', 'padding-top', 'padding-bottom']
          : ['border-left-width', 'border-right-width', 'padding-left', 'padding-right']
          ).inject(dim, function(memo, prop) {
          var v; return (v = proceed(element, prop)) === null ? memo : memo - parseInt(v, 10)
        }) + 'px';
      default: return proceed(element, style);
      }
    });
}
/*--------------------------------------------------------------------------*/
/* DOM: IE */
else if (Prototype.Browser.IE) {
  Element.Methods.getOffsetParent = Element.Methods.getOffsetParent.wrap(
    function(proceed, element) {
      element = $(element);
      try { element.offsetParent }
      catch(e) { return $(document.body) }
      var position = element.getStyle('position');
      if (position !== 'static') return proceed(element);
      element.setStyle({ position: 'relative' });
      var value = proceed(element);
      element.setStyle({ position: position });
      return value;
    }
  );
  $w('positionedOffset viewportOffset').each(function(method) {
    Element.Methods[method] = Element.Methods[method].wrap(function(proceed, element) {
        element = $(element);
        try { element.offsetParent } catch(e) { return Element._returnOffset(0,0) }
        var position;
        if ((position = element.getStyle('position')) !== 'static') return proceed(element);
        var offsetParent;
        if ((offsetParent = element.getOffsetParent()) && offsetParent.getStyle('position') === 'fixed') offsetParent.setStyle({ zoom: 1 });
        element.setStyle({position: 'relative'});
        var value = proceed(element);
        element.setStyle({position: position});
        return value;
      });
  });
  Element.Methods.cumulativeOffset = Element.Methods.cumulativeOffset.wrap(function(proceed, element) {
      try { element.offsetParent } catch(e) { return Element._returnOffset(0, 0) }
      return proceed(element);
    });
  Element.Methods.getStyle = function(element, style) {
    element = $(element), style = (style == 'float' || style == 'cssFloat') ? 'styleFloat' : style.camelize();
    var v;
    if (style == 'opacity') return v = (element.getStyle('filter') || '').match(/alpha\(opacity=(.*)\)/) && v[1] ? parseFloat(v[1]) / 100 : 1.0;
    if (!(v = element.style[style]) && element.currentStyle) v = element.currentStyle[style];
    if (v == 'auto') return (style == 'width' || style == 'height') && element.getStyle('display') != 'none' ? element['offset' + style.capitalize()] + 'px' : null;
    return v;
  };
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    var s = element.style, f;
    if ((f = element.currentStyle) && !f.hasLayout || !f && s.zoom == 'normal') s.zoom = 1;
    f = (element.getStyle('filter') || '').replace(/alpha\([^\)]*\)/gi, '');
    if (value == 1 || value == '' || value == 'auto') {
      if (f == '') s.removeAttribute('filter'); else s.filter = f;
      return element;
    } else if (value < 0.00001) value = 0;
    s.filter = f + 'alpha(opacity=' + (value * 100) + ')';
    return element;
  };
  Element._attributeTranslations = (function(){
    var e = document.createElement('DIV');
    var classProp;
    e.setAttribute(classProp = 'className', 'x');
    if (e.className !== 'x') {
      e.setAttribute('class', 'x');
      if (e.className === 'x') classProp = 'class';
    }
    e = null;
    e = document.createElement('LABEL');
    var forProp;
    e.setAttribute(forProp = 'for', 'x');
    if (e.htmlFor !== 'x') {
      e.setAttribute('htmlFor', 'x');
      if (e.htmlFor === 'x') forProp = 'htmlFor';
    }
    e = null;
    return {
      read: {
        names: {
          'class': classProp, 'className': classProp,
          'for': forProp, 'htmlFor': forProp
        },
        values: {
          style: function(element) { return element.style.cssText.toLowerCase() },
          title: function(element) { return element.title },
          _getAttr: function(element, attribute) { return element.getAttribute(attribute, 2) },
          _getAttrNode: function(element, attribute) {
            var node; return (node = element.getAttributeNode(attribute)) ? node.value : '';
          },
          _flag: function(element, attribute) { return $(element).hasAttribute(attribute) ? attribute : null },
          _getEv: (function() {
            var e;
            (e = document.createElement('DIV')).onclick = Prototype.emptyFunction;
            var v = e.getAttribute('onclick');
            e = null;
            return (String(v).indexOf('{') > -1) && function(element, attribute) {
                if (!(attribute = element.getAttribute(attribute)) return null;
                return ((attribute = attribute.toString()).match(/\{(.*)\}/)[1] || attribute).strip()
              }
            } || v === '' && function(element, attribute) {
                if (!(attribute = element.getAttribute(attribute))) return null;
                return attribute.strip()
              }
            } || null
          })(),
        }
      }
    }
  })();
  Element._attributeTranslations.write = {
    names: Object.extend({
      cellpadding: 'cellPadding',
      cellspacing: 'cellSpacing'
    }, Element._attributeTranslations.read.names),
    values: {
      checked: function(element, value) {
        element.checked = !!value;
      },

      style: function(element, value) {
        element.style.cssText = value ? value : '';
      }
    }
  };
  Element._attributeTranslations.has = {};
  $w('colSpan rowSpan vAlign dateTime accessKey tabIndex encType maxLength readOnly longDesc frameBorder').each(function(attr) {
    Element._attributeTranslations.write.names[attr.toLowerCase()] = attr;
    Element._attributeTranslations.has[attr.toLowerCase()] = attr;
  });
  (function(v) {
    Object.extend(v, {
      href:        v._getAttr,
      src:         v._getAttr,
      type:        v._getAttr,
      action:      v._getAttrNode,
      disabled:    v._flag,
      checked:     v._flag,
      readonly:    v._flag,
      multiple:    v._flag,
      onload:      v._getEv,
      onunload:    v._getEv,
      onclick:     v._getEv,
      ondblclick:  v._getEv,
      onmousedown: v._getEv,
      onmouseup:   v._getEv,
      onmouseover: v._getEv,
      onmousemove: v._getEv,
      onmouseout:  v._getEv,
      onfocus:     v._getEv,
      onblur:      v._getEv,
      onkeypress:  v._getEv,
      onkeydown:   v._getEv,
      onkeyup:     v._getEv,
      onsubmit:    v._getEv,
      onreset:     v._getEv,
      onselect:    v._getEv,
      onchange:    v._getEv
    });
  })(Element._attributeTranslations.read.values);
  if (Prototype.BrowserFeatures.ElementExtensions) {
    (function() {
      function _descendants(element) {
        var nodes = element.getElementsByTagName('*'), results = [];
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName !== "!") // Filter out comment nodes.
            results.push(node);
        return results;
      }
      Element.Methods.down = function(element, expression, index) {
        element = $(element);
        if (arguments.length == 1) return element.firstDescendant();
        return Object.isNumber(expression) ? _descendants(element)[expression] :
          Element.select(element, expression)[index || 0];
      }
    })();
  }
} else if (Prototype.Browser.Gecko && /rv:1\.8\.0/.test(navigator.userAgent)) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1) ? 0.999999 :
      (value === '') ? '' : (value < 0.00001) ? 0 : value;
    return element;
  };
}
/*--------------------------------------------------------------------------*/
/* DOM: WebKit */
else if (Prototype.Browser.WebKit) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;

    if (value == 1)
      if(element.tagName.toUpperCase() == 'IMG' && element.width) {
        element.width++; element.width--;
      } else try {
        var n = document.createTextNode(' ');
        element.appendChild(n);
        element.removeChild(n);
      } catch (e) { }

    return element;
  };
  Element.Methods.cumulativeOffset = function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == document.body)
        if (Element.getStyle(element, 'position') == 'absolute') break;

      element = element.offsetParent;
    } while (element);
    return Element._returnOffset(valueL, valueT);
  };
}
/*--------------------------------------------------------------------------*/
if ('outerHTML' in document.documentElement) {
  Element.Methods.replace = function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) {
      element.parentNode.replaceChild(content, element);
      return element;
    }
    content = Object.toHTML(content);
    var parent = element.parentNode, tagName = parent.tagName.toUpperCase();
    if (Element._insertionTranslations.tags[tagName]) {
      var nextSibling = element.next();
      var fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
      parent.removeChild(element);
      if (nextSibling)
        fragments.each(function(node) { parent.insertBefore(node, nextSibling) });
      else
        fragments.each(function(node) { parent.appendChild(node) });
    }
    else element.outerHTML = content.stripScripts();
    content.evalScripts.bind(content).defer();
    return element;
  };
}
Element._returnOffset = function(l, t) {
  var result = [l, t];
  result.left = l;
  result.top = t;
  return result;
};
Element._getContentFromAnonymousElement = function(tagName, html) {
  var div = new Element('div'), t = Element._insertionTranslations.tags[tagName];
  if (t) {
    div.innerHTML = t[0] + html + t[1];
    t[2].times(function() { div = div.firstChild });
  } else div.innerHTML = html;
  return $A(div.childNodes);
};
Element._insertionTranslations = {
  before: function(element, node) {
    element.parentNode.insertBefore(node, element);
  },
  top: function(element, node) {
    element.insertBefore(node, element.firstChild);
  },
  bottom: function(element, node) {
    element.appendChild(node);
  },
  after: function(element, node) {
    element.parentNode.insertBefore(node, element.nextSibling);
  },
  tags: {
    TABLE:  ['<table>',                '</table>',                   1],
    TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
    TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
    TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
    SELECT: ['<select>',               '</select>',                  1]
  }
};
(function() {
  Object.extend(this.tags, {
    THEAD: this.tags.TBODY,
    TFOOT: this.tags.TBODY,
    TH:    this.tags.TD
  });
}).call(Element._insertionTranslations);
Element.Methods.Simulated = {
  hasAttribute: function(element, attribute) {
    attribute = Element._attributeTranslations.has[attribute] || attribute;
    var node = $(element).getAttributeNode(attribute);
    return !!(node && node.specified);
  }
};
Element.Methods.ByTag = { };
Object.extend(Element, Element.Methods);
(function(div) {
  if (!Prototype.BrowserFeatures.ElementExtensions && div['__proto__']) {
    window.HTMLElement = { };
    window.HTMLElement.prototype = div['__proto__'];
    Prototype.BrowserFeatures.ElementExtensions = true;
  }
  div = null;
})(document.createElement('DIV'))
Element.extend = (function() {
  function checkDeficiency(tagName) {
    if (typeof window.Element != 'undefined') {
      var proto = window.Element.prototype;
      if (proto) {
        var id = '_' + (Math.random()+'').slice(2);
        var el = document.createElement(tagName);
        proto[id] = 'x';
        var isBuggy = (el[id] !== 'x');
        delete proto[id];
        el = null;
        return isBuggy;
      }
    }
    return false;
  }
  function extendElementWith(element, methods) {
    for (var property in methods) {
      var value = methods[property];
      if (Object.isFunction(value) && !(property in element))
        element[property] = value.methodize();
    }
  }
  var HTMLOBJECTELEMENT_PROTOTYPE_BUGGY = checkDeficiency('object');
  var HTMLAPPLETELEMENT_PROTOTYPE_BUGGY = checkDeficiency('applet');
  if (Prototype.BrowserFeatures.SpecificElementExtensions) {
    if (HTMLOBJECTELEMENT_PROTOTYPE_BUGGY &&
        HTMLAPPLETELEMENT_PROTOTYPE_BUGGY) {
      return function(element) {
        if (element && element.tagName) {
          var tagName = element.tagName.toUpperCase();
          if (tagName === 'OBJECT' || tagName === 'APPLET') {
            extendElementWith(element, Element.Methods);
            if (tagName === 'OBJECT') {
              extendElementWith(element, Element.Methods.ByTag.OBJECT)
            }
            else if (tagName === 'APPLET') {
              extendElementWith(element, Element.Methods.ByTag.APPLET)
            }
          }
        }
        return element;
      }
    }
    return Prototype.K;
  }
  var Methods = { }, ByTag = Element.Methods.ByTag;
  var extend = Object.extend(function(element) {
    if (!element || typeof element._extendedByPrototype != 'undefined' ||
        element.nodeType != 1 || element == window) return element;
    var methods = Object.clone(Methods),
        tagName = element.tagName.toUpperCase();
    if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);
    extendElementWith(element, methods);
    element._extendedByPrototype = Prototype.emptyFunction;
    return element;
  }, {
    refresh: function() {
      if (!Prototype.BrowserFeatures.ElementExtensions) {
        Object.extend(Methods, Element.Methods);
        Object.extend(Methods, Element.Methods.Simulated);
      }
    }
  });
  extend.refresh();
  return extend;
})();
Element.hasAttribute = function(element, attribute) {
  if (element.hasAttribute) return element.hasAttribute(attribute);
  return Element.Methods.Simulated.hasAttribute(element, attribute);
};
Element.addMethods = function(methods) {
  var F = Prototype.BrowserFeatures, T = Element.Methods.ByTag;
  if (!methods) {
    Object.extend(Form, Form.Methods);
    Object.extend(Form.Element, Form.Element.Methods);
    Object.extend(Element.Methods.ByTag, {
      "FORM":     Object.clone(Form.Methods),
      "INPUT":    Object.clone(Form.Element.Methods),
      "SELECT":   Object.clone(Form.Element.Methods),
      "TEXTAREA": Object.clone(Form.Element.Methods)
    });
  }
  if (arguments.length == 2) {
    var tagName = methods;
    methods = arguments[1];
  }
  if (!tagName) Object.extend(Element.Methods, methods || { });
  else {
    if (Object.isArray(tagName)) tagName.each(extend);
    else extend(tagName);
  }
  function extend(tagName) {
    tagName = tagName.toUpperCase();
    if (!Element.Methods.ByTag[tagName])
      Element.Methods.ByTag[tagName] = { };
    Object.extend(Element.Methods.ByTag[tagName], methods);
  }
  function copy(methods, destination, onlyIfAbsent) {
    onlyIfAbsent = onlyIfAbsent || false;
    for (var property in methods) {
      var value = methods[property];
      if (!Object.isFunction(value)) continue;
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = value.methodize();
    }
  }
  function findDOMClass(tagName) {
    var klass, trans;
    if ((trans = {
      'H1': 'Heading', 'H2': 'Heading', 'H3': 'Heading', 'H4': 'Heading', 'H5': 'Heading', 'H6': 'Heading',
      'P': 'Paragraph', 'DIR': 'Directory', 'UL': 'UList', 'OL': 'OList', 'DL': 'DList', 'DATALIST': 'DataList',
      'Q': 'Quote', 'INS': 'Mod', 'DEL': 'Mod', 'A': 'Anchor', 'IMG': 'Image',
      'CAPTION': 'TableCaption', 'COLGROUP': 'TableCol', 'COL': 'TableCol',
      'THEAD': 'TableSection', 'TBODY': 'TableSection', 'TFOOT': 'TableSection',
      'TR': 'TableRow', 'TH': 'TableCell', 'TD': 'TableCell',
      'FIELDSET': 'FieldSet', 'TEXTAREA': 'TextArea', 'OPTGROUP': 'OptGroup',
      'FRAMESET': 'FrameSet', 'IFRAME': 'IFrame', 'FENCEDFRAME': 'FendedFrame'
    })[tagName = tagName.toUpperCase()] && window[klass = 'HTML' + trans[tagName] + 'Element']
    || window[klass = 'HTML' + tagName + Element']
    || window[klass = 'HTML' + tagName.capitalize() + 'Element']) return window[klass];
    var e = document.createElement(tagName), p = e['__proto__'] || e.constructor.prototype;
    e = null;
    return p
  }
  var elementPrototype = window.HTMLElement ? HTMLElement.prototype : Element.prototype;
  if (F.ElementExtensions) copy(Element.Methods, elementPrototype), copy(Element.Methods.Simulated, elementPrototype, true);
  if (F.SpecificElementExtensions) for (var t in Element.Methods.ByTag) {
    var c;
    if (Object.isUndefined(c = findDOMClass(t))) continue;
    copy(T[t], c.prototype)
  }
  Object.extend(Element, Element.Methods);
  delete Element.ByTag;
  if (Element.extend.refresh) Element.extend.refresh();
  Element.cache = { }
};
document.viewport = {
  getDimensions: function() { return { width: this.getWidth(), height: this.getHeight() } },
  getScrollOffsets: function() {
    return Element._returnOffset(
      window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
      window.pageYOffset || document.documentElement.scrollTop  || document.body.scrollTop)
  }
};
(function(viewport) {
  var B = Prototype.Browser, getRootElement
    = (B.WebKit && !document.evaluate) ? function() { return document }
    : (B.Opera && window.parseFloat(window.opera.version()) < 9.5) ? function() { return document.body }
    : function() { return document.documentElement },
    e, p = {};
  function define(D) {
    if (!e) e = getRootElement();
    p[D] = 'client' + D;
    return (viewport['get' + D] = function() { return e[p[D]] })()
  }
  viewport.getWidth = define.curry('Width'), viewport.getHeight = define.curry('Height')
})(document.viewport);
Element.Storage = { UID: 1 };
Element.addMethods({
  getStorage: function(element) {
    if (!(element = $(element))) return;
    var u;
    if (element === window) u = 0;
    else {
      if (typeof element._prototypeUID === 'undefined') element._prototypeUID = [Element.Storage.UID++];
      u = element._prototypeUID[0]
    }
    if (!Element.Storage[u]) Element.Storage[u] = $H();
    return Element.Storage[u];
  },
  store: function(element, key, value) {
    if (!(element = $(element))) return;
    if (arguments.length === 2) element.getStorage().update(key); else element.getStorage().set(key, value);
    return element
  },
  retrieve: function(element, key, defaultValue) {
    if (!(element = $(element))) return;
    var h = Element.getStorage(element), v = h.get(key);
    if (Object.isUndefined(value)) h.set(key, defaultValue), v = defaultValue;
    return v
  },
  clone: function(element, deep) {
    if (!(element = $(element))) return;
    var clone = element.cloneNode(deep);
    clone._prototypeUID = void 0;
    if (deep) {
      var descendants = Element.select(clone, '*'),
          i = descendants.length;
      while (i--) {
        descendants[i]._prototypeUID = void 0;
      }
    }
    return Element.extend(clone);
  }
});
/* Portions of the Selector class are derived from Jack Slocum's DomQuery,
 * part of YUI-Ext version 0.40, distributed under the terms of an MIT-style
 * license.  Please see http://www.yui-ext.com/ for more information. */
var Selector = Class.create({
  initialize: function(expression) {
    this.expression = expression.strip();
    if (this.shouldUseSelectorsAPI()) {
      this.mode = 'selectorsAPI';
    } else if (this.shouldUseXPath()) {
      this.mode = 'xpath';
      this.compileXPathMatcher();
    } else {
      this.mode = 'normal';
      this.compileMatcher();
    }
  },
  shouldUseXPath: (function() {
    var IS_DESCENDANT_SELECTOR_BUGGY = (function(){
      var isBuggy = false;
      if (document.evaluate && window.XPathResult) {
        var el = document.createElement('div');
        el.innerHTML = '<ul><li></li></ul><div><ul><li></li></ul></div>';
        var xpath = ".//*[local-name()='ul' or local-name()='UL']//*[local-name()='li' or local-name()='LI']";
        var result = document.evaluate(xpath, el, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        isBuggy = (result.snapshotLength !== 2);
        el = null;
      }
      return isBuggy;
    })();
    return function() {
      if (!Prototype.BrowserFeatures.XPath) return false;

      var e = this.expression;

      if (Prototype.Browser.WebKit &&
       (e.include("-of-type") || e.include(":empty")))
        return false;

      if ((/(\[[\w-]*?:|:checked)/).test(e))
        return false;

      if (IS_DESCENDANT_SELECTOR_BUGGY) return false;

      return true;
    }

  })(),

  shouldUseSelectorsAPI: function() {
    if (!Prototype.BrowserFeatures.SelectorsAPI) return false;

    if (Selector.CASE_INSENSITIVE_CLASS_NAMES) return false;

    if (!Selector._div) Selector._div = new Element('div');

    try {
      Selector._div.querySelector(this.expression);
    } catch(e) {
      return false;
    }

    return true;
  },

  compileMatcher: function() {
    var e = this.expression, ps = Selector.patterns, h = Selector.handlers,
        c = Selector.criteria, le, p, m, len = ps.length, name;

    if (Selector._cache[e]) {
      this.matcher = Selector._cache[e];
      return;
    }

    this.matcher = ["this.matcher = function(root) {",
                    "var r = root, h = Selector.handlers, c = false, n;"];

    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i = 0; i<len; i++) {
        p = ps[i].re;
        name = ps[i].name;
        if (m = e.match(p)) {
          this.matcher.push(Object.isFunction(c[name]) ? c[name](m) :
            new Template(c[name]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.matcher.push("return h.unique(n);\n}");
    eval(this.matcher.join('\n'));
    Selector._cache[this.expression] = this.matcher;
  },

  compileXPathMatcher: function() {
    var e = this.expression, ps = Selector.patterns,
        x = Selector.xpath, le, m, len = ps.length, name;

    if (Selector._cache[e]) {
      this.xpath = Selector._cache[e]; return;
    }

    this.matcher = ['.//*'];
    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i = 0; i<len; i++) {
        name = ps[i].name;
        if (m = e.match(ps[i].re)) {
          this.matcher.push(Object.isFunction(x[name]) ? x[name](m) :
            new Template(x[name]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.xpath = this.matcher.join('');
    Selector._cache[this.expression] = this.xpath;
  },

  findElements: function(root) {
    root = root || document;
    var e = this.expression, results;

    switch (this.mode) {
      case 'selectorsAPI':
        if (root !== document) {
          var oldId = root.id, id = $(root).identify();
          id = id.replace(/[\.:\\]/g, "\\$&");
          e = "#" + id + " " + e;
        }

        results = $A(root.querySelectorAll(e)).map(Element.extend);
        root.id = oldId;

        return results;
      case 'xpath':
        return document._getElementsByXPath(this.xpath, root);
      default:
       return this.matcher(root);
    }
  },

  match: function(element) {
    this.tokens = [];

    var e = this.expression, ps = Selector.patterns, as = Selector.assertions;
    var le, p, m, len = ps.length, name;

    while (e && le !== e && (/\S/).test(e)) {
      le = e;
      for (var i = 0; i<len; i++) {
        p = ps[i].re;
        name = ps[i].name;
        if (m = e.match(p)) {
          if (as[name]) {
            this.tokens.push([name, Object.clone(m)]);
            e = e.replace(m[0], '');
          } else {
            return this.findElements(document).include(element);
          }
        }
      }
    }

    var match = true, name, matches;
    for (var i = 0, token; token = this.tokens[i]; i++) {
      name = token[0], matches = token[1];
      if (!Selector.assertions[name](element, matches)) {
        match = false; break;
      }
    }

    return match;
  },

  toString: function() {
    return this.expression;
  },

  inspect: function() {
    return "#<Selector:" + this.expression.inspect() + ">";
  }
});

if (Prototype.BrowserFeatures.SelectorsAPI &&
 document.compatMode === 'BackCompat') {
  Selector.CASE_INSENSITIVE_CLASS_NAMES = (function(){
    var div = document.createElement('div'),
     span = document.createElement('span');

    div.id = "prototype_test_id";
    span.className = 'Test';
    div.appendChild(span);
    var isIgnored = (div.querySelector('#prototype_test_id .test') !== null);
    div = span = null;
    return isIgnored;
  })();
}

Object.extend(Selector, {
  _cache: { },

  xpath: {
    descendant:   "//*",
    child:        "/*",
    adjacent:     "/following-sibling::*[1]",
    laterSibling: '/following-sibling::*',
    tagName:      function(m) {
      if (m[1] == '*') return '';
      return "[local-name()='" + m[1].toLowerCase() +
             "' or local-name()='" + m[1].toUpperCase() + "']";
    },
    className:    "[contains(concat(' ', @class, ' '), ' #{1} ')]",
    id:           "[@id='#{1}']",
    attrPresence: function(m) {
      m[1] = m[1].toLowerCase();
      return new Template("[@#{1}]").evaluate(m);
    },
    attr: function(m) {
      m[1] = m[1].toLowerCase();
      m[3] = m[5] || m[6];
      return new Template(Selector.xpath.operators[m[2]]).evaluate(m);
    },
    pseudo: function(m) {
      var h = Selector.xpath.pseudos[m[1]];
      if (!h) return '';
      if (Object.isFunction(h)) return h(m);
      return new Template(Selector.xpath.pseudos[m[1]]).evaluate(m);
    },
    operators: {
      '=':  "[@#{1}='#{3}']",
      '!=': "[@#{1}!='#{3}']",
      '^=': "[starts-with(@#{1}, '#{3}')]",
      '$=': "[substring(@#{1}, (string-length(@#{1}) - string-length('#{3}') + 1))='#{3}']",
      '*=': "[contains(@#{1}, '#{3}')]",
      '~=': "[contains(concat(' ', @#{1}, ' '), ' #{3} ')]",
      '|=': "[contains(concat('-', @#{1}, '-'), '-#{3}-')]"
    },
    pseudos: {
      'first-child': '[not(preceding-sibling::*)]',
      'last-child':  '[not(following-sibling::*)]',
      'only-child':  '[not(preceding-sibling::* or following-sibling::*)]',
      'empty':       "[count(*) = 0 and (count(text()) = 0)]",
      'checked':     "[@checked]",
      'disabled':    "[(@disabled) and (@type!='hidden')]",
      'enabled':     "[not(@disabled) and (@type!='hidden')]",
      'not': function(m) {
        var e = m[6], p = Selector.patterns,
            x = Selector.xpath, le, v, len = p.length, name;

        var exclusion = [];
        while (e && le != e && (/\S/).test(e)) {
          le = e;
          for (var i = 0; i<len; i++) {
            name = p[i].name
            if (m = e.match(p[i].re)) {
              v = Object.isFunction(x[name]) ? x[name](m) : new Template(x[name]).evaluate(m);
              exclusion.push("(" + v.substring(1, v.length - 1) + ")");
              e = e.replace(m[0], '');
              break;
            }
          }
        }
        return "[not(" + exclusion.join(" and ") + ")]";
      },
      'nth-child':      function(m) {
        return Selector.xpath.pseudos.nth("(count(./preceding-sibling::*) + 1) ", m);
      },
      'nth-last-child': function(m) {
        return Selector.xpath.pseudos.nth("(count(./following-sibling::*) + 1) ", m);
      },
      'nth-of-type':    function(m) {
        return Selector.xpath.pseudos.nth("position() ", m);
      },
      'nth-last-of-type': function(m) {
        return Selector.xpath.pseudos.nth("(last() + 1 - position()) ", m);
      },
      'first-of-type':  function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-of-type'](m);
      },
      'last-of-type':   function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-last-of-type'](m);
      },
      'only-of-type':   function(m) {
        var p = Selector.xpath.pseudos; return p['first-of-type'](m) + p['last-of-type'](m);
      },
      nth: function(fragment, m) {
        var mm, formula = m[6], predicate;
        if (formula == 'even') formula = '2n+0';
        if (formula == 'odd')  formula = '2n+1';
        if (mm = formula.match(/^(\d+)$/)) // digit only
          return '[' + fragment + "= " + mm[1] + ']';
        if (mm = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
          if (mm[1] == "-") mm[1] = -1;
          var a = mm[1] ? Number(mm[1]) : 1;
          var b = mm[2] ? Number(mm[2]) : 0;
          predicate = "[((#{fragment} - #{b}) mod #{a} = 0) and " +
          "((#{fragment} - #{b}) div #{a} >= 0)]";
          return new Template(predicate).evaluate({
            fragment: fragment, a: a, b: b });
        }
      }
    }
  },

  criteria: {
    tagName:      'n = h.tagName(n, r, "#{1}", c);      c = false;',
    className:    'n = h.className(n, r, "#{1}", c);    c = false;',
    id:           'n = h.id(n, r, "#{1}", c);           c = false;',
    attrPresence: 'n = h.attrPresence(n, r, "#{1}", c); c = false;',
    attr: function(m) {
      m[3] = (m[5] || m[6]);
      return new Template('n = h.attr(n, r, "#{1}", "#{3}", "#{2}", c); c = false;').evaluate(m);
    },
    pseudo: function(m) {
      if (m[6]) m[6] = m[6].replace(/["\\]/g, '\\$&');
      return new Template('n = h.pseudo(n, "#{1}", "#{6}", r, c); c = false;').evaluate(m);
    },
    descendant:   'c = "descendant";',
    child:        'c = "child";',
    adjacent:     'c = "adjacent";',
    laterSibling: 'c = "laterSibling";'
  },

  patterns: [
    { name: 'laterSibling', re: /^\s*~\s*/ },
    { name: 'child',        re: /^\s*>\s*/ },
    { name: 'adjacent',     re: /^\s*\+\s*/ },
    { name: 'descendant',   re: /^\s/ },

    { name: 'tagName',      re: /^\s*(\*|[\w\-]+)(\b|$)?/ },
    { name: 'id',           re: /^#([\w\-\*]+)(\b|$)/ },
    { name: 'className',    re: /^\.([\w\-\*]+)(\b|$)/ },
    { name: 'pseudo',       re: /^:((first|last|nth|nth-last|only)(-child|-of-type)|empty|checked|(en|dis)abled|not)(\((.*?)\))?(\b|$|(?=\s|[:+~>]))/ },
    { name: 'attrPresence', re: /^\[((?:[\w-]+:)?[\w-]+)\]/ },
    { name: 'attr',         re: /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]?=)\s*((['"])([^\4]*?)\4|([^'"][^\]]*?)))?\]/ }
  ],

  assertions: {
    tagName: function(element, matches) {
      return matches[1].toUpperCase() == element.tagName.toUpperCase();
    },

    className: function(element, matches) {
      return Element.hasClassName(element, matches[1]);
    },

    id: function(element, matches) {
      return element.id === matches[1];
    },

    attrPresence: function(element, matches) {
      return Element.hasAttribute(element, matches[1]);
    },

    attr: function(element, matches) {
      var nodeValue = Element.readAttribute(element, matches[1]);
      return nodeValue && Selector.operators[matches[2]](nodeValue, matches[5] || matches[6]);
    }
  },

  handlers: {
    concat: function(a, b) {
      for (var i = 0, node; node = b[i]; i++)
        a.push(node);
      return a;
    },

    mark: function(nodes) {
      var _true = Prototype.emptyFunction;
      for (var i = 0, node; node = nodes[i]; i++)
        node._countedByPrototype = _true;
      return nodes;
    },

    unmark: function(nodes) {
      for (var i = 0, node; node = nodes[i]; i++)
        node._countedByPrototype = undefined;
      return nodes;
    },

    index: function(parentNode, reverse, ofType) {
      parentNode._countedByPrototype = Prototype.emptyFunction;
      if (reverse) {
        for (var nodes = parentNode.childNodes, i = nodes.length - 1, j = 1; i >= 0; i--) {
          var node = nodes[i];
          if (node.nodeType == 1 && (!ofType || node._countedByPrototype)) node.nodeIndex = j++;
        }
      } else {
        for (var i = 0, j = 1, nodes = parentNode.childNodes; node = nodes[i]; i++)
          if (node.nodeType == 1 && (!ofType || node._countedByPrototype)) node.nodeIndex = j++;
      }
    },

    unique: function(nodes) {
      if (nodes.length == 0) return nodes;
      var results = [], n;
      for (var i = 0, l = nodes.length; i < l; i++)
        if (typeof (n = nodes[i])._countedByPrototype == 'undefined') {
          n._countedByPrototype = Prototype.emptyFunction;
          results.push(Element.extend(n));
        }
      return Selector.handlers.unmark(results);
    },

    descendant: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, node.getElementsByTagName('*'));
      return results;
    },

    child: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        for (var j = 0, child; child = node.childNodes[j]; j++)
          if (child.nodeType == 1 && child.tagName != '!') results.push(child);
      }
      return results;
    },

    adjacent: function(nodes) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        var next = this.nextElementSibling(node);
        if (next) results.push(next);
      }
      return results;
    },

    laterSibling: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, Element.nextSiblings(node));
      return results;
    },

    nextElementSibling: function(node) {
      while (node = node.nextSibling)
        if (node.nodeType == 1) return node;
      return null;
    },

    previousElementSibling: function(node) {
      while (node = node.previousSibling)
        if (node.nodeType == 1) return node;
      return null;
    },

    tagName: function(nodes, root, tagName, combinator) {
      var uTagName = tagName.toUpperCase();
      var results = [], h = Selector.handlers;
      if (nodes) {
        if (combinator) {
          if (combinator == "descendant") {
            for (var i = 0, node; node = nodes[i]; i++)
              h.concat(results, node.getElementsByTagName(tagName));
            return results;
          } else nodes = this[combinator](nodes);
          if (tagName == "*") return nodes;
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName.toUpperCase() === uTagName) results.push(node);
        return results;
      } else return root.getElementsByTagName(tagName);
    },

    id: function(nodes, root, id, combinator) {
      var targetNode = $(id), h = Selector.handlers;

      if (root == document) {
        if (!targetNode) return [];
        if (!nodes) return [targetNode];
      } else {
        if (!root.sourceIndex || root.sourceIndex < 1) {
          var nodes = root.getElementsByTagName('*');
          for (var j = 0, node; node = nodes[j]; j++) {
            if (node.id === id) return [node];
          }
        }
      }

      if (nodes) {
        if (combinator) {
          if (combinator == 'child') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (targetNode.parentNode == node) return [targetNode];
          } else if (combinator == 'descendant') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Element.descendantOf(targetNode, node)) return [targetNode];
          } else if (combinator == 'adjacent') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Selector.handlers.previousElementSibling(targetNode) == node)
                return [targetNode];
          } else nodes = h[combinator](nodes);
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node == targetNode) return [targetNode];
        return [];
      }
      return (targetNode && Element.descendantOf(targetNode, root)) ? [targetNode] : [];
    },

    className: function(nodes, root, className, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      return Selector.handlers.byClassName(nodes, root, className);
    },

    byClassName: function(nodes, root, className) {
      if (!nodes) nodes = Selector.handlers.descendant([root]);
      var needle = ' ' + className + ' ';
      for (var i = 0, results = [], node, nodeClassName; node = nodes[i]; i++) {
        nodeClassName = node.className;
        if (nodeClassName.length == 0) continue;
        if (nodeClassName == className || (' ' + nodeClassName + ' ').include(needle))
          results.push(node);
      }
      return results;
    },

    attrPresence: function(nodes, root, attr, combinator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      if (nodes && combinator) nodes = this[combinator](nodes);
      var results = [];
      for (var i = 0, node; node = nodes[i]; i++)
        if (Element.hasAttribute(node, attr)) results.push(node);
      return results;
    },

    attr: function(nodes, root, attr, value, operator, combinator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      if (nodes && combinator) nodes = this[combinator](nodes);
      var handler = Selector.operators[operator], results = [];
      for (var i = 0, node; node = nodes[i]; i++) {
        var nodeValue = Element.readAttribute(node, attr);
        if (nodeValue === null) continue;
        if (handler(nodeValue, value)) results.push(node);
      }
      return results;
    },

    pseudo: function(nodes, name, value, root, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      if (!nodes) nodes = root.getElementsByTagName("*");
      return Selector.pseudos[name](nodes, value, root);
    }
  },

  pseudos: {
    'first-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.previousElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'last-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.nextElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'only-child': function(nodes, value, root) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!h.previousElementSibling(node) && !h.nextElementSibling(node))
          results.push(node);
      return results;
    },
    'nth-child':        function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root);
    },
    'nth-last-child':   function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true);
    },
    'nth-of-type':      function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, false, true);
    },
    'nth-last-of-type': function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true, true);
    },
    'first-of-type':    function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, false, true);
    },
    'last-of-type':     function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, true, true);
    },
    'only-of-type':     function(nodes, formula, root) {
      var p = Selector.pseudos;
      return p['last-of-type'](p['first-of-type'](nodes, formula, root), formula, root);
    },

    getIndices: function(a, b, total) {
      if (a == 0) return b > 0 ? [b] : [];
      return $R(1, total).inject([], function(memo, i) {
        if (0 == (i - b) % a && (i - b) / a >= 0) memo.push(i);
        return memo;
      });
    },

    nth: function(nodes, formula, root, reverse, ofType) {
      if (nodes.length == 0) return [];
      if (formula == 'even') formula = '2n+0';
      if (formula == 'odd')  formula = '2n+1';
      var h = Selector.handlers, results = [], indexed = [], m;
      h.mark(nodes);
      for (var i = 0, node; node = nodes[i]; i++) {
        if (!node.parentNode._countedByPrototype) {
          h.index(node.parentNode, reverse, ofType);
          indexed.push(node.parentNode);
        }
      }
      if (formula.match(/^\d+$/)) { // just a number
        formula = Number(formula);
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.nodeIndex == formula) results.push(node);
      } else if (m = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
        if (m[1] == "-") m[1] = -1;
        var a = m[1] ? Number(m[1]) : 1;
        var b = m[2] ? Number(m[2]) : 0;
        var indices = Selector.pseudos.getIndices(a, b, nodes.length);
        for (var i = 0, node, l = indices.length; node = nodes[i]; i++) {
          for (var j = 0; j < l; j++)
            if (node.nodeIndex == indices[j]) results.push(node);
        }
      }
      h.unmark(nodes);
      h.unmark(indexed);
      return results;
    },

    'empty': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (node.tagName == '!' || node.firstChild) continue;
        results.push(node);
      }
      return results;
    },

    'not': function(nodes, selector, root) {
      var h = Selector.handlers, selectorType, m;
      var exclusions = new Selector(selector).findElements(root);
      h.mark(exclusions);
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node._countedByPrototype) results.push(node);
      h.unmark(exclusions);
      return results;
    },

    'enabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node.disabled && (!node.type || node.type !== 'hidden'))
          results.push(node);
      return results;
    },

    'disabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.disabled) results.push(node);
      return results;
    },

    'checked': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.checked) results.push(node);
      return results;
    }
  },

  operators: {
    '=':  function(nv, v) { return nv == v; },
    '!=': function(nv, v) { return nv != v; },
    '^=': function(nv, v) { return nv == v || nv && nv.startsWith(v); },
    '$=': function(nv, v) { return nv == v || nv && nv.endsWith(v); },
    '*=': function(nv, v) { return nv == v || nv && nv.include(v); },
    '~=': function(nv, v) { return (' ' + nv + ' ').include(' ' + v + ' '); },
    '|=': function(nv, v) { return ('-' + (nv || "").toUpperCase() +
     '-').include('-' + (v || "").toUpperCase() + '-'); }
  },

  split: function(expression) {
    var expressions = [];
    expression.scan(/([^,]+)(,|$)/, function(m) {
      expressions.push(m[1].strip());
    });
    return expressions;
  },

  matchElements: function(elements, expression) {
    var matches = $$(expression), h = Selector.handlers;
    h.mark(matches);
    for (var i = 0, results = [], element; element = elements[i]; i++)
      if (element._countedByPrototype) results.push(element);
    h.unmark(matches);
    return results;
  },

  findElement: function(elements, expression, index) {
    if (Object.isNumber(expression)) {
      index = expression; expression = false;
    }
    return Selector.matchElements(elements, expression || '*')[index || 0];
  },

  findChildElements: function(element, expressions) {
    expressions = Selector.split(expressions.join(','));
    var results = [], h = Selector.handlers;
    for (var i = 0, l = expressions.length, selector; i < l; i++) {
      selector = new Selector(expressions[i].strip());
      h.concat(results, selector.findElements(element));
    }
    return (l > 1) ? h.unique(results) : results;
  }
});

if (Prototype.Browser.IE) {
  Object.extend(Selector.handlers, {
    concat: function(a, b) {
      for (var i = 0, node; node = b[i]; i++)
        if (node.tagName !== "!") a.push(node);
      return a;
    },

    unmark: function(nodes) {
      for (var i = 0, node; node = nodes[i]; i++)
        node.removeAttribute('_countedByPrototype');
      return nodes;
    }
  });
}

function $$() {
  return Selector.findChildElements(document, $A(arguments));
}

var Form = {
  reset: function(form) {
    form = $(form);
    form.reset();
    return form;
  },

  serializeElements: function(elements, options) {
    if (typeof options != 'object') options = { hash: !!options };
    else if (Object.isUndefined(options.hash)) options.hash = true;
    var key, value, submitted = false, submit = options.submit;

    var data = elements.inject({ }, function(result, element) {
      if (!element.disabled && element.name) {
        key = element.name; value = $(element).getValue();
        if (value != null && element.type != 'file' && (element.type != 'submit' || (!submitted &&
            submit !== false && (!submit || key == submit) && (submitted = true)))) {
          if (key in result) {
            if (!Object.isArray(result[key])) result[key] = [result[key]];
            result[key].push(value);
          }
          else result[key] = value;
        }
      }
      return result;
    });

    return options.hash ? data : Object.toQueryString(data);
  }
};

Form.Methods = {
  serialize: function(form, options) {
    return Form.serializeElements(Form.getElements(form), options);
  },

  getElements: function(form) {
    var elements = $(form).getElementsByTagName('*'),
        element,
        arr = [ ],
        serializers = Form.Element.Serializers;
    for (var i = 0; element = elements[i]; i++) {
      arr.push(element);
    }
    return arr.inject([], function(elements, child) {
      if (serializers[child.tagName.toLowerCase()])
        elements.push(Element.extend(child));
      return elements;
    })
  },

  getInputs: function(form, typeName, name) {
    form = $(form);
    var inputs = form.getElementsByTagName('input');

    if (!typeName && !name) return $A(inputs).map(Element.extend);

    for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
      var input = inputs[i];
      if ((typeName && input.type != typeName) || (name && input.name != name))
        continue;
      matchingInputs.push(Element.extend(input));
    }

    return matchingInputs;
  },

  disable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('disable');
    return form;
  },

  enable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('enable');
    return form;
  },

  findFirstElement: function(form) {
    var elements = $(form).getElements().findAll(function(element) {
      return 'hidden' != element.type && !element.disabled;
    });
    var firstByIndex = elements.findAll(function(element) {
      return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
    }).sortBy(function(element) { return element.tabIndex }).first();

    return firstByIndex ? firstByIndex : elements.find(function(element) {
      return ['input', 'select', 'textarea'].include(element.tagName.toLowerCase());
    });
  },

  focusFirstElement: function(form) {
    form = $(form);
    form.findFirstElement().activate();
    return form;
  },

  request: function(form, options) {
    form = $(form), options = Object.clone(options || { });

    var params = options.parameters, action = form.readAttribute('action') || '';
    if (action.blank()) action = window.location.href;
    options.parameters = form.serialize(true);

    if (params) {
      if (Object.isString(params)) params = params.toQueryParams();
      Object.extend(options.parameters, params);
    }

    if (form.hasAttribute('method') && !options.method)
      options.method = form.method;

    return new Ajax.Request(action, options);
  }
};

/*--------------------------------------------------------------------------*/


Form.Element = {
  focus: function(element) {
    $(element).focus();
    return element;
  },

  select: function(element) {
    $(element).select();
    return element;
  }
};

Form.Element.Methods = {

  serialize: function(element) {
    element = $(element);
    if (!element.disabled && element.name) {
      var value = element.getValue();
      if (value != undefined) {
        var pair = { };
        pair[element.name] = value;
        return Object.toQueryString(pair);
      }
    }
    return '';
  },

  getValue: function(element) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    return Form.Element.Serializers[method](element);
  },

  setValue: function(element, value) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    Form.Element.Serializers[method](element, value);
    return element;
  },

  clear: function(element) {
    $(element).value = '';
    return element;
  },

  present: function(element) {
    return $(element).value != '';
  },

  activate: function(element) {
    element = $(element);
    try {
      element.focus();
      if (element.select && (element.tagName.toLowerCase() != 'input' ||
          !['button', 'reset', 'submit'].include(element.type)))
        element.select();
    } catch (e) { }
    return element;
  },

  disable: function(element) {
    element = $(element);
    element.disabled = true;
    return element;
  },

  enable: function(element) {
    element = $(element);
    element.disabled = false;
    return element;
  }
};

/*--------------------------------------------------------------------------*/

var Field = Form.Element;

var $F = Form.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

Form.Element.Serializers = {
  input: function(element, value) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        return Form.Element.Serializers.inputSelector(element, value);
      default:
        return Form.Element.Serializers.textarea(element, value);
    }
  },

  inputSelector: function(element, value) {
    if (Object.isUndefined(value)) return element.checked ? element.value : null;
    else element.checked = !!value;
  },

  textarea: function(element, value) {
    if (Object.isUndefined(value)) return element.value;
    else element.value = value;
  },

  select: function(element, value) {
    if (Object.isUndefined(value))
      return this[element.type == 'select-one' ?
        'selectOne' : 'selectMany'](element);
    else {
      var opt, currentValue, single = !Object.isArray(value);
      for (var i = 0, length = element.length; i < length; i++) {
        opt = element.options[i];
        currentValue = this.optionValue(opt);
        if (single) {
          if (currentValue == value) {
            opt.selected = true;
            return;
          }
        }
        else opt.selected = value.include(currentValue);
      }
    }
  },

  selectOne: function(element) {
    var index = element.selectedIndex;
    return index >= 0 ? this.optionValue(element.options[index]) : null;
  },

  selectMany: function(element) {
    var values, length = element.length;
    if (!length) return null;

    for (var i = 0, values = []; i < length; i++) {
      var opt = element.options[i];
      if (opt.selected) values.push(this.optionValue(opt));
    }
    return values;
  },

  optionValue: function(opt) {
    return Element.extend(opt).hasAttribute('value') ? opt.value : opt.text;
  }
};

/*--------------------------------------------------------------------------*/
Abstract.TimedObserver = Class.create(PeriodicalExecuter, {
  initialize: function($super, element, frequency, callback) { $super(callback, frequency), this.element = $(element), this.lastValue = this.getValue() },
  execute: function() {
    var value = this.getValue();
    if (Object.isString(this.lastValue) && Object.isString(value)
        ? this.lastValue != value
        : String(this.lastValue) != String(value))
      this.callback(this.element, value), this.lastValue = value;
  }
});
Form.Element.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() { return Form.Element.getValue(this.element) }
});
Form.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() { return Form.serialize(this.element) }
});
/*--------------------------------------------------------------------------*/
Abstract.EventObserver = Class.create({
  initialize: function(element, callback) {
    this.element = $(element), this.callback = callback, this.lastValue = this.getValue();
    if (this.element.tagName.toLowerCase() == 'form') this.registerFormCallbacks();
    else this.registerCallback(this.element);
  },
  onElementEvent: function() {
    var value;
    if ((value = this.getValue()) != this.lastValue) this.callback(this.element, value), this.lastValue = value
  },
  registerFormCallbacks: function() { Form.getElements(this.element).each(this.registerCallback, this) },
  registerCallback: function(element) {
    if (element.type) switch (element.type.toLowerCase()) {
      case 'checkbox': case 'radio': Event.observe(element, 'click', this.onElementEvent.bind(this)); break;
      default: Event.observe(element, 'change', this.onElementEvent.bind(this)); break;
    }
  }
});
Form.Element.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() { return Form.Element.getValue(this.element) }
});
Form.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() { return Form.serialize(this.element) }
});
(function() {
  var Event = {
    KEY_BACKSPACE: 8,
    KEY_TAB: 9,
    KEY_RETURN: 13,
    KEY_ESC: 27,
    KEY_PAGEUP: 33,
    KEY_PAGEDOWN: 34,
    KEY_END: 35,
    KEY_HOME: 36,
    KEY_LEFT: 37,
    KEY_UP: 38,
    KEY_RIGHT: 39,
    KEY_DOWN: 40,
    KEY_INSERT: 45,
    KEY_DELETE: 46,
    cache: {}
  };
  var _isButton;
  if (Prototype.Browser.IE) {
    var buttonMap = { 0: 1, 1: 4, 2: 2 };
    _isButton = function(event, code) { return event.button === buttonMap[code] }
  } else if (Prototype.Browser.WebKit) _isButton = function(event, code) {
    switch (code) {
    case 0: return event.which == 1 && !event.metaKey;
    case 1: return event.which == 1 && event.metaKey;
    default: return false
    }
  } else _isButton = function(event, code) {
    return event.which ? (event.which === code + 1) : (event.button === code)
  }
  function isLeftClick(event)   { return _isButton(event, 0) }
  function isMiddleClick(event) { return _isButton(event, 1) }
  function isRightClick(event)  { return _isButton(event, 2) }
  function element(event) {
    var node = (event = Event.extend(event)).target, type = event.type, currentTarget = event.currentTarget;
    if (currentTarget && currentTarget.tagName && (type === 'load' || type === 'error' || type === 'click' &&
      currentTarget.tagName.toLowerCase() === 'input' && currentTarget.type === 'radio')) node = currentTarget;
    if (node.nodeType == Node.TEXT_NODE) node = node.parentNode;
    return Element.extend(node)
  }
  function findElement(event, expression) {
    if (!expression) return Event.element(event);
    return Selector.findElement([Event.element(event)].concat(element.ancestors()), expression, 0)
  }
  function pointer(event) { return { x: pointerX(event), y: pointerY(event) } }
  function pointerX(event) {
    var docElement;
    return event.pageX || event.clientX
      + ((docElement = document.documentElement).scrollLeft || (document.body || { scrollLeft: 0 }).scrollLeft)
      - (docElement.clientLeft || 0);
  }
  function pointerY(event) {
    var docElement;
    return event.pageY || event.clientY
      + ((docElement = document.documentElement).scrollTop || (document.body || { scrollTop: 0 }).scrollTop)
      - (docElement.clientTop || 0);
  }
  function stop(event) { Event.extend(event), event.preventDefault(), event.stopPropagation(), event.stopped = true }
  Event.Methods = {
    isLeftClick: isLeftClick,
    isMiddleClick: isMiddleClick,
    isRightClick: isRightClick,
    element: element,
    findElement: findElement,
    pointer: pointer,
    pointerX: pointerX,
    pointerY: pointerY,
    stop: stop
  };
  var methods = Object.keys(Event.Methods).inject({ }, function(m, name) {
    m[name] = Event.Methods[name].methodize();
    return m
  });
  if (Prototype.Browser.IE) {
    function _relatedTarget(event) {
      var element;
      switch (event.type) {
      case 'mouseover': element = event.fromElement; break;
      case 'mouseout': element = event.toElement; break;
      default: return null;
      }
      return Element.extend(element)
    }
    Object.extend(methods, {
      stopPropagation: function() { this.cancelBubble = true },
      preventDefault:  function() { this.returnValue = false },
      inspect: function() { return '[object Event]' }
    });
    Event.extend = function(event, element) {
      if (!event) return false;
      if (event._extendedByPrototype) return event;
      event._extendedByPrototype = Prototype.emptyFunction;
      var pointer = Event.pointer(event);
      Object.extend(event, {
        pageX: pointer.x, pageY: pointer.y,
        target: event.srcElement || element,
        relatedTarget: _relatedTarget(event)
      });
      return Object.extend(event, methods)
    }
  } else Event.prototype = window.Event.prototype || document.createEvent('HTMLEvents').__proto__, Object.extend(Event.prototype, methods), Event.extend = Prototype.K;
  var CACHE = [];
  function _createResponder(element, eventName, handler) {
    var registry;
    if (Object.isUndefined(registry = Element.retrieve(element, 'prototype_event_registry')))
      CACHE.push(element), registry = Element.retrieve(element, 'prototype_event_registry', $H());
    var respondersForEvent = registry.get(eventName);
    if (Object.isUndefined()) respondersForEvent = [], registry.set(eventName, respondersForEvent)
    if (respondersForEvent.pluck('handler').include(handler)) return false;
    var responder;
    if (eventName.include(":")) {
      responder = function(event) {
        if (Object.isUndefined(event.eventName)) return false;
        if (event.eventName !== eventName) return false;
        Event.extend(event, element), handler.call(element, event)
      }
    } else if (!Prototype.Browser.IE && (eventName === "mouseenter" || eventName === "mouseleave")) {
      if (eventName === "mouseenter" || eventName === "mouseleave") {
        responder = function(event) {
          Event.extend(event, element);
          var parent = event.relatedTarget;
          while (parent && parent !== element)
            try { parent = parent.parentNode } catch(e) { parent = element }
          if (parent === element) return;
          handler.call(element, event)
        }
      }
    } else responder = function(event) { Event.extend(event, element), handler.call(element, event) };
    responder.handler = handler, respondersForEvent.push(responder);
    return responder
  }
  function _destroyCache() {
    for (var i = 0, n = CACHE.length; i < n; i++) {
      Event.stopObserving(CACHE[i]);
      CACHE[i] = null;
    }
  }
  if (Prototype.Browser.IE) window.attachEvent('onunload', _destroyCache);
  if (Prototype.Browser.WebKit) window.addEventListener('unload', Prototype.emptyFunction, false);
  var _getDOMEventName = Prototype.Browser.IE &&  function(eventName) {
      var translations = { mouseenter: "mouseover", mouseleave: "mouseout" };
      return eventName in translations ? translations[eventName] : eventName;
  } || Prototype.K
  function observe(element, eventName, handler) {
    var responder;
    if (!(responder = _createResponder(element = $(element), eventName, handler))) return element;
    if (eventName.include(':'))
      if (element.addEventListener) element.addEventListener("dataavailable", responder, false);
      else element.attachEvent("ondataavailable", responder), element.attachEvent("onfilterchange", responder);
    else if (element.addEventListener) element.addEventListener(_getDOMEventName(eventName), responder, false);
    else element.attachEvent("on" + _getDOMEventName(eventName), responder)
    return element
  }
  function stopObserving(element, eventName, handler) {
    var registry;
    if (Object.isUndefined(registry = Element.retrieve(element = $(element), 'prototype_event_registry'))) return element;
    if (eventName && !handler) {
      var responders;
      if (Object.isUndefined(responders = registry.get(eventName))) return element;
      responders.each(function(r) { Element.stopObserving(element, eventName, r.handler) });
      return element;
    } else if (!eventName) {
      registry.each(function(pair) {
        var eventName = pair.key, responders = pair.value;
        responders.each(function(r) { Element.stopObserving(element, eventName, r.handler) });
      });
      return element
    }
    var responders;
    if (!(responders = registry.get(eventName))) return;
    var responder;
    if (!(responder = responders.find(function(r) { return r.handler === handler }))) return element;
    if (eventName.include(':'))
      if (element.removeEventListener) element.removeEventListener("dataavailable", responder, false);
      else element.detachEvent("ondataavailable", responder), element.detachEvent("onfilterchange",  responder);
    else if (element.removeEventListener) element.removeEventListener(_getDOMEventName(eventName), responder, false);
    else element.detachEvent('on' + _getDOMEventName(eventName), responder);
    registry.set(eventName, responders.without(responder));
    return element
  }
  function fire(element, eventName, memo, bubble) {
    element = $(element);
    if (Object.isUndefined(bubble)) bubble = true;
    if (element == document && document.createEvent && !element.dispatchEvent) element = document.documentElement;
    var event;
    if (document.createEvent) event = document.createEvent('HTMLEvents'), event.initEvent('dataavailable', true, true);
    else event = document.createEventObject(), event.eventType = bubble ? 'ondataavailable' : 'onfilterchange';
    event.eventName = eventName, event.memo = memo || { };
    if (document.createEvent) element.dispatchEvent(event);
    else element.fireEvent(event.eventType, event);
    return Event.extend(event)
  }
  Object.extend(Event, Event.Methods);
  Object.extend(Event, {
    fire: fire,
    observe: observe,
    stopObserving: stopObserving
  });
  Element.addMethods({
    fire: fire,
    observe: observe,
    stopObserving: stopObserving
  });
  Object.extend(document, {
    fire: fire.methodize(),
    observe: observe.methodize(),
    stopObserving: stopObserving.methodize(),
    loaded: false
  });
  if (window.Event) Object.extend(window.Event, Event); else window.Event = Event
})();
(function() {
  /* Support for the DOMContentLoaded event is based on work by Dan Webb,
     Matthias Miller, Dean Edwards, John Resig, and Diego Perini. */
  var timer;
  function fireContentLoadedEvent() {
    if (document.loaded) return;
    if (timer) window.clearTimeout(timer);
    document.loaded = true;
    document.fire('dom:loaded')
  }
  function checkReadyState() {
    if (document.readyState === 'complete') {
      document.stopObserving('readystatechange', checkReadyState);
      fireContentLoadedEvent()
    }
  }
  function pollDoScroll() {
    try { document.documentElement.doScroll('left') } catch(e) {
      timer = pollDoScroll.defer();
      return;
    }
    fireContentLoadedEvent()
  }
  if (document.addEventListener) document.addEventListener('DOMContentLoaded', fireContentLoadedEvent, false); else {
    document.observe('readystatechange', checkReadyState);
    if (window == top) timer = pollDoScroll.defer()
  }
  Event.observe(window, 'load', fireContentLoadedEvent)
})();
Element.addMethods();
/*------------------------------- DEPRECATED -------------------------------*/
Hash.toQueryString = Object.toQueryString;
Element.Methods.childOf = Element.Methods.descendantOf;
var $continue = new Error('"throw $continue" is deprecated, use "return" instead'), Toggle = {
  display: Element.toggle
}, Insertion = {
  Before: function(element, content) { return Element.insert(element, {before:content}) },
  Top: function(element, content) { return Element.insert(element, {top:content}) },
  Bottom: function(element, content) { return Element.insert(element, {bottom:content}) },
  After: function(element, content) { return Element.insert(element, {after:content}) }
}, Position = {
  includeScrollOffsets: false,
  prepare: function() {
    this.deltaX =  window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0,
    this.deltaY =  window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
  },
  within: function(element, x, y) {
    if (this.includeScrollOffsets) return this.withinIncludingScrolloffsets(element, x, y);
    this.xcomp = x, this.ycomp = y, this.offset = Element.cumulativeOffset(element);
    return (y >= this.offset[1] && y < this.offset[1] + element.offsetHeight &&
            x >= this.offset[0] && x < this.offset[0] + element.offsetWidth)
  },
  withinIncludingScrolloffsets: function(element, x, y) {
    var offsetcache = Element.cumulativeScrollOffset(element);
    this.xcomp = x + offsetcache[0] - this.deltaX, this.ycomp = y + offsetcache[1] - this.deltaY, this.offset = Element.cumulativeOffset(element);
    return (this.ycomp >= this.offset[1] && this.ycomp < this.offset[1] + element.offsetHeight &&
            this.xcomp >= this.offset[0] && this.xcomp < this.offset[0] + element.offsetWidth)
  },
  overlap: function(mode, element) {
    if (!mode) return 0;
    if (mode == 'vertical') return ((this.offset[1] + element.offsetHeight) - this.ycomp) / element.offsetHeight;
    if (mode == 'horizontal') return ((this.offset[0] + element.offsetWidth) - this.xcomp) / element.offsetWidth
  },
  cumulativeOffset: Element.Methods.cumulativeOffset,
  positionedOffset: Element.Methods.positionedOffset,
  absolutize: function(element) {
    Position.prepare();
    return Element.absolutize(element)
  },
  relativize: function(element) {
    Position.prepare();
    return Element.relativize(element)
  },
  realOffset: Element.Methods.cumulativeScrollOffset,
  offsetParent: Element.Methods.getOffsetParent,
  page: Element.Methods.viewportOffset,
  clone: function(source, target, options) { return Element.clonePosition(target, source, options || { }) }
};
/*--------------------------------------------------------------------------*/
if (!document.getElementsByClassName) document.getElementsByClassName = function(instanceMethods){
  instanceMethods.getElementsByClassName = Prototype.BrowserFeatures.XPath
    ? function(element, className) {
      var c = /\s/.test(className = className.toString().strip()) ? $w(className).map(function(n) {
        return n.blank() ? null : "[contains(concat(' ',@class,' '),' " + n + " ')]"
      }).join('') : iter(className);
      return c ? document._getElementsByXPath('.//*' + c, element) : []
    } : function(element, className) {
      var classNames = (/\s/.test(className = className.toString().strip()) ? $w(className) : null), e = [];
      if (!classNames && !className) return e;
      className = ' ' + className + ' ';
      for (var i = 0, c, cn, n = $(element).getElementsByTagName('*'); c = n[i]; i++)
        if (child.className && ((cn = ' ' + c.className + ' ').include(className) || classNames && classNames.all(function(name) {
            return !name.toString().blank() && cn.include(' ' + name + ' '); })))
          e.push(Element.extend(c))
      return e
    };
  return function(className, parentElement) { return $(parentElement || document.body).getElementsByClassName(className) }
}(Element.Methods);
/*--------------------------------------------------------------------------*/
Element.ClassNames = Class.create();
Element.ClassNames.prototype = {
  initialize: function(element) { this.element = $(element) },
  _each: function(iterator) { this.element.className.split(/\s+/).select(function(name) { return name.length > 0 })._each(iterator) },
  set: function(className) { this.element.className = className },
  toString: function() { return $A(this).join(' ') },
  add: function(classNameToAdd) {
    if (this.include(classNameToAdd)) return;
    this.set($A(this).concat(classNameToAdd).join(' '))
  },
  remove: function(classNameToRemove) {
    if (!this.include(classNameToRemove)) return;
    this.set($A(this).without(classNameToRemove).join(' '))
  }
};
Object.extend(Element.ClassNames.prototype, Enumerable);
/*--------------------------------------------------------------------------*/
