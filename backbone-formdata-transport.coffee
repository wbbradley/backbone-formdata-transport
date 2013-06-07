make_utils = (name) ->
  log = (level, msg) ->
    console.log "#{name} : #{level} : #{msg}"
  error = (msg) ->
    throw new Error "#{name} : error : #{msg}"
  [log, error]

make_utils 'Backbone.FormDataTransport'

error 'I depend on jQuery and it does not seem to be loaded' if not $
error 'I depend on Backbone and it does not seem to be loaded' if not Backbone?.ajax

class FormDataTransportModel extends Backbone.Model
  set_file_field: (field_name, file) =>
    @files = @files or {}
    @files[field_name] = file

  sync: (method, model, options) =>
    [log, error] = make_utils 'Backbone.FormDataTransport.Model'

    options.model = @
    if @files
      # set multipart_form_data to invoke the new FormData transport
      options.multipart_form_data = true

      options.upload_events =
        progress: (event) => @trigger 'upload_progress', event
        load: (event) => @trigger 'upload_load', event
        error: (event) => @trigger 'upload_error', event
        abort: (event) => @trigger 'upload_abort', event
      options.events =
        progress: (event) => @trigger 'progress', event
        load: (event) => @trigger 'load', event
        error: (event) => @trigger 'error', event
        abort: (event) => @trigger 'abort', event

      # keep track of which files we're attempting to upload
      pending_files = _.clone(@files)

    xhr = super

    if pending_files
      xhr.done =>
        if Math.floor(xhr.status / 100) is 2
          for name, file of pending_files
            if name of @files
              if file is @files[name]
                delete @files[name]
              else
                log 'warning', "it looks like #{name} has changed while we were attempting an upload (that turned out to succeed)"
        return

transport_name = 'multipart-form-data'

$.ajaxPrefilter (options, origOptions, jqXHR) ->
  if options.multipart_form_data
    transport_name

# Register the new jQuery AjaxTransport
$.ajaxTransport transport_name, (options, origOptions, jqXHR) ->
  # Remove transport_name from the data types list so that further processing is
  # based on the content type returned by the server, without attempting an
  # (unsupported) conversion from transport_name to the actual type.
  options.dataTypes.shift()
 
  callback = null

  return {
    send: (headers, complete) ->
      [log, error] = make_utils "#{transport_name}-transport"

      model = options.model
      files = model?.files || {}

      xhr = new XMLHttpRequest
      callback = (_, isAbort) ->
        try
          if callback and (isAbort or xhr.readyState is 4)
            if isAbort
              if xhr.readyState isnt 4
                xhr.abort()

            else
              status = xhr.status
              responseHeaders = xhr.getAllResponseHeaders()
              responses = {}
              xml = xhr.responseXML
              if xml and xml.documentElement
                responses.xml = xml
              try
                responses.text = xhr.responseText
              catch error
                log 'warning', error

              try
                statusText = xhr.statusText
              catch error
                log 'warning', error
                statusText = ''
        catch error
          if not isAbort
            complete(-1, error)
        if responses
          complete(xhr.status, statusText, responses, responseHeaders)

      xhr.onreadystatechange = callback

      for event, handler of options?.events or {}
        xhr.addEventListener event, handler, false

      for event, handler of options?.upload_events or {}
        xhr.upload.addEventListener event, handler, false

      xhr.open options.type, options.url, true

      x_csrf = 'X-CSRFToken'
      xhr.setRequestHeader x_csrf, headers[x_csrf] if x_csrf of headers
       
      form_data = new FormData
      for field_name, file of files
        form_data.append field_name, file

      options.data = $.parseJSON(options.data) if typeof options.data is 'string'

      for key, value of options.data
        if not files[key]
          form_data.append key, value

      # Initiate a multipart/form-data upload
      xhr.send form_data
      return xhr

    abort: ->
      log 'warning', 'file upload aborted'
      if callback
          callback 0, 1
  }

class FormDataTransport
  @csrf_token: null
  @Model: FormDataTransportModel

Backbone.FormDataTransport = FormDataTransport
