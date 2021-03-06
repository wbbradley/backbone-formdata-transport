/Applications /Library /Network /System /User Information /Users /Volumes /bin /cores /dev /etc /home /mach_kernel /net /private /sbin /tmp /usr /var backbone-formdata-transport-0.1.1 dist/ node_modules/
// Generated by CoffeeScript 1.6.3
(function() {
  var FormDataTransport, FormDataTransportModel, error, hasKeys, log, make_utils, transport_name, _ref, _ref1,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  make_utils = function(name) {
    var error, log;
    log = function(level, msg) {
      return console.log("" + name + " : " + level + " : " + msg);
    };
    error = function(msg) {
      throw new Error("" + name + " : error : " + msg);
    };
    return [log, error];
  };

  _ref = make_utils('Backbone.FormDataTransport'), log = _ref[0], error = _ref[1];

  if (!$) {
    error('I depend on jQuery and it does not seem to be loaded');
  }

  if (!(typeof Backbone !== "undefined" && Backbone !== null ? Backbone.ajax : void 0)) {
    error('I depend on Backbone and it does not seem to be loaded');
  }

  hasKeys = function(obj) {
    var key, size, value;
    if (typeof obj === 'object') {
      size = 0;
      for (key in obj) {
        value = obj[key];
        if (obj.hasOwnProperty(key)) {
          return true;
        }
      }
    }
    return false;
  };

  FormDataTransportModel = (function(_super) {
    __extends(FormDataTransportModel, _super);

    function FormDataTransportModel() {
      this.sync = __bind(this.sync, this);
      this.set_file_field = __bind(this.set_file_field, this);
      _ref1 = FormDataTransportModel.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    FormDataTransportModel.prototype.set_file_field = function(field_name, file) {
      this.files = this.files || {};
      this.files[field_name] = file;
      return this.trigger('form-data-transport-model:files-added');
    };

    FormDataTransportModel.prototype.sync = function(method, model, options) {
      var pending_files, xhr, _ref2,
        _this = this;
      _ref2 = make_utils('Backbone.FormDataTransport.Model'), log = _ref2[0], error = _ref2[1];
      options.model = this;
      if (hasKeys(this.files)) {
        options.multipart_form_data = true;
        options.upload_events = {
          progress: function(event) {
            return _this.trigger('upload_progress', event);
          },
          load: function(event) {
            return _this.trigger('upload_load', event);
          },
          error: function(event) {
            return _this.trigger('upload_error', event);
          },
          abort: function(event) {
            return _this.trigger('upload_abort', event);
          }
        };
        options.events = {
          progress: function(event) {
            return _this.trigger('progress', event);
          },
          load: function(event) {
            return _this.trigger('load', event);
          },
          error: function(event) {
            return _this.trigger('error', event);
          },
          abort: function(event) {
            return _this.trigger('abort', event);
          }
        };
        pending_files = _.clone(this.files);
      }
      xhr = FormDataTransportModel.__super__.sync.apply(this, arguments);
      if (pending_files) {
        xhr.done(function() {
          var file, name;
          if (Math.floor(xhr.status / 100) === 2) {
            for (name in pending_files) {
              file = pending_files[name];
              if (name in _this.files) {
                if (file === _this.files[name]) {
                  delete _this.files[name];
                } else {
                  log('warning', "it looks like " + name + " has changed while we were attempting an upload (that turned out to succeed)");
                }
              }
            }
          }
        });
      }
      return xhr;
    };

    return FormDataTransportModel;

  })(Backbone.Model);

  transport_name = 'multipart-form-data';

  $.ajaxPrefilter(function(options, origOptions, jqXHR) {
    if (options.multipart_form_data) {
      return transport_name;
    }
  });

  $.ajaxTransport(transport_name, function(options, origOptions, jqXHR) {
    var callback;
    options.dataTypes.shift();
    callback = null;
    return {
      send: function(headers, complete) {
        var event, field_name, file, files, form_data, handler, key, model, value, x_csrf, xhr, _ref2, _ref3, _ref4, _ref5;
        _ref2 = make_utils("" + transport_name + "-transport"), log = _ref2[0], error = _ref2[1];
        model = options.model;
        files = (model != null ? model.files : void 0) || {};
        xhr = new XMLHttpRequest;
        callback = function(_, isAbort) {
          var responseHeaders, responses, status, statusText, xml;
          try {
            if (callback && (isAbort || xhr.readyState === 4)) {
              if (isAbort) {
                if (xhr.readyState !== 4) {
                  xhr.abort();
                }
              } else {
                status = xhr.status;
                responseHeaders = xhr.getAllResponseHeaders();
                responses = {};
                xml = xhr.responseXML;
                if (xml && xml.documentElement) {
                  responses.xml = xml;
                }
                try {
                  responses.text = xhr.responseText;
                } catch (_error) {
                  error = _error;
                  log('warning', error);
                }
                try {
                  statusText = xhr.statusText;
                } catch (_error) {
                  error = _error;
                  log('warning', error);
                  statusText = '';
                }
              }
            }
          } catch (_error) {
            error = _error;
            if (!isAbort) {
              complete(-1, error);
            }
          }
          if (responses) {
            return complete(xhr.status, statusText, responses, responseHeaders);
          }
        };
        xhr.onreadystatechange = callback;
        _ref3 = (options != null ? options.events : void 0) || {};
        for (event in _ref3) {
          handler = _ref3[event];
          xhr.addEventListener(event, handler, false);
        }
        _ref4 = (options != null ? options.upload_events : void 0) || {};
        for (event in _ref4) {
          handler = _ref4[event];
          xhr.upload.addEventListener(event, handler, false);
        }
        xhr.open(options.type, options.url, true);
        x_csrf = 'X-CSRFToken';
        if (x_csrf in headers) {
          xhr.setRequestHeader(x_csrf, headers[x_csrf]);
        }
        xhr.setRequestHeader('Accept', 'application/json');
        form_data = new FormData;
        for (field_name in files) {
          file = files[field_name];
          form_data.append(field_name, file);
        }
        if (typeof options.data === 'string') {
          options.data = $.parseJSON(options.data);
        }
        _ref5 = options.data;
        for (key in _ref5) {
          value = _ref5[key];
          if (!files[key]) {
            form_data.append(key, value);
          }
        }
        xhr.send(form_data);
        return xhr;
      },
      abort: function() {
        log('warning', 'file upload aborted');
        if (callback) {
          return callback(0, 1);
        }
      }
    };
  });

  FormDataTransport = (function() {
    function FormDataTransport() {}

    FormDataTransport.Model = FormDataTransportModel;

    return FormDataTransport;

  })();

  Backbone.FormDataTransport = FormDataTransport;

}).call(this);
